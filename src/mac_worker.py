#!/usr/bin/env python3
"""
mac_worker.py — Standalone Apple Silicon Local ASR Pull-Worker Daemon.

Features:
- Polls Hetzner /api/worker/transcript-jobs/poll for queued YouTube transcription tasks.
- Extracts direct 64kbps Opus/AAC audio stream URL via yt-dlp on residential Wi-Fi.
- In-memory float32 PCM decoding via PyAV directly into NumPy array (0 disk I/O, no ffmpeg CLI).
- Transcribes on Apple M5 Pro Metal GPU using mlx-whisper (whisper-large-v3-turbo).
- Posts dual-representation transcript results (full text + timestamped segments) to /complete.
- Periodically reports presence and system health to /heartbeat.
- Respects battery threshold (pauses when battery <= 10% on battery power).
"""

import os
import sys
import time
import signal
import socket
import platform
import logging
from typing import Dict, Any, Optional, Tuple, List

try:
    import numpy as np
except ImportError:
    np = None  # type: ignore

try:
    import av
except ImportError:
    av = None  # type: ignore

try:
    import yt_dlp
except ImportError:
    yt_dlp = None  # type: ignore

try:
    import mlx_whisper
except ImportError:
    mlx_whisper = None  # type: ignore

try:
    import requests
except ImportError:
    requests = None  # type: ignore

try:
    import psutil
except ImportError:
    psutil = None  # type: ignore

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [MacWorker] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("MacWorker")

# Configuration via environment variables
BRAIN_SERVER_URL = os.getenv("BRAIN_SERVER_URL", "http://127.0.0.1:3000").rstrip("/")
BRAIN_WORKER_TOKEN = os.getenv("BRAIN_WORKER_TOKEN", os.getenv("BRAIN_API_TOKEN", ""))
WORKER_ID = os.getenv("WORKER_ID", "mac-m5-pro")
DEFAULT_MODEL = os.getenv("WHISPER_MODEL", "mlx-community/whisper-large-v3-turbo")
POLL_INTERVAL_SECONDS = float(os.getenv("POLL_INTERVAL_SECONDS", "5.0"))
HEARTBEAT_INTERVAL_SECONDS = float(os.getenv("HEARTBEAT_INTERVAL_SECONDS", "60.0"))
MIN_BATTERY_PERCENT = float(os.getenv("MIN_BATTERY_PERCENT", "10.0"))


class MacAsrWorker:
    def __init__(
        self,
        server_url: str = BRAIN_SERVER_URL,
        token: str = BRAIN_WORKER_TOKEN,
        worker_id: str = WORKER_ID,
        default_model: str = DEFAULT_MODEL,
        poll_interval: float = POLL_INTERVAL_SECONDS,
        heartbeat_interval: float = HEARTBEAT_INTERVAL_SECONDS,
    ):
        self.server_url = server_url.rstrip("/")
        self.token = token
        self.worker_id = worker_id
        self.default_model = default_model
        self.poll_interval = poll_interval
        self.heartbeat_interval = heartbeat_interval
        self.running = True
        self.last_heartbeat = 0.0

        self.hostname = socket.gethostname()
        self.system_info = self._detect_system_info()

    def _detect_system_info(self) -> str:
        machine = platform.machine()
        processor = platform.processor()
        os_ver = platform.mac_ver()[0]
        ram_gb = ""
        if psutil:
            ram_gb = f", {round(psutil.virtual_memory().total / (1024**3))}GB RAM"
        return f"Apple Silicon ({machine}/{processor}), macOS {os_ver}{ram_gb}"

    def get_headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "x-worker-name": self.worker_id,
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def is_battery_low(self) -> bool:
        if not psutil or not hasattr(psutil, "sensors_battery"):
            return False
        battery = psutil.sensors_battery()
        if battery is None:
            return False
        if not battery.power_plugged and battery.percent <= MIN_BATTERY_PERCENT:
            logger.warning(
                f"Battery level ({battery.percent}%) is <= {MIN_BATTERY_PERCENT}% without power. Pausing worker."
            )
            return True
        return False

    def send_heartbeat(self) -> bool:
        if not requests:
            return False
        url = f"{self.server_url}/api/worker/transcript-jobs/heartbeat"
        payload = {
            "workerId": self.worker_id,
            "hostname": self.hostname,
            "systemInfo": self.system_info,
        }
        try:
            res = requests.post(url, json=payload, headers=self.get_headers(), timeout=10)
            if res.status_code == 200:
                self.last_heartbeat = time.time()
                return True
            else:
                logger.warning(f"Heartbeat rejected: HTTP {res.status_code} {res.text}")
                return False
        except Exception as e:
            logger.warning(f"Heartbeat network error: {e}")
            return False

    def poll_job(self) -> Optional[Dict[str, Any]]:
        if not requests:
            return None
        url = f"{self.server_url}/api/worker/transcript-jobs/poll?worker_name={self.worker_id}"
        try:
            res = requests.get(url, headers=self.get_headers(), timeout=15)
            if res.status_code == 204:
                return None
            elif res.status_code == 200:
                data = res.json()
                return data.get("job")
            elif res.status_code == 401:
                logger.error("Authentication failed: invalid BRAIN_WORKER_TOKEN.")
                time.sleep(10)
                return None
            else:
                logger.warning(f"Poll returned HTTP {res.status_code}: {res.text}")
                return None
        except Exception as e:
            logger.debug(f"Poll network check: {e}")
            return None

    def extract_audio_stream_url(self, video_url_or_id: str) -> Tuple[str, str]:
        if not yt_dlp:
            raise RuntimeError("yt_dlp package is not installed.")

        if not video_url_or_id.startswith("http"):
            video_url = f"https://www.youtube.com/watch?v={video_url_or_id}"
        else:
            video_url = video_url_or_id

        ydl_opts = {
            "format": "ba/b",
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            if not info:
                raise ValueError(f"Could not extract video info for {video_url}")
            stream_url = info.get("url")
            title = info.get("title", "")
            if not stream_url:
                raise ValueError(f"No direct audio stream URL found for {video_url}")
            return stream_url, title

    def decode_audio_to_pcm(self, stream_url: str) -> Tuple[Any, float]:
        """
        Decodes remote audio stream into 16kHz mono float32 NumPy array in memory via PyAV.
        Zero disk I/O, zero external ffmpeg binary execution.
        """
        if not av or not np:
            raise RuntimeError("av and numpy packages are required for in-memory audio decoding.")

        container = av.open(stream_url)
        resampler = av.AudioResampler(format="fltp", layout="mono", rate=16000)

        audio_frames = []
        for frame in container.decode(audio=0):
            for resampled_frame in resampler.resample(frame):
                audio_frames.append(resampled_frame.to_ndarray())

        if not audio_frames:
            raise ValueError("No audio frames decoded from stream.")

        audio_data = np.concatenate(audio_frames, axis=1).squeeze(0)
        duration_seconds = float(len(audio_data)) / 16000.0
        return audio_data, duration_seconds

    def transcribe_audio(
        self, audio_data: Any, model_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribes 16kHz float32 audio NumPy array using mlx-whisper on Apple Silicon GPU.
        """
        if not mlx_whisper:
            raise RuntimeError("mlx_whisper package is not installed.")

        model = model_name or self.default_model
        if not model.startswith("mlx-community/") and not os.path.exists(model):
            model = f"mlx-community/{model}"

        start_time = time.time()
        logger.info(f"Starting MLX Whisper inference using model: {model}...")

        result = mlx_whisper.transcribe(
            audio_data,
            path_or_hf_repo=model,
            temperature=0.0,
            word_timestamps=False,
        )

        latency = time.time() - start_time
        return {
            "result": result,
            "latency_seconds": latency,
            "model_used": model,
        }

    def process_job(self, job: Dict[str, Any]) -> bool:
        job_id = job.get("id")
        item_id = job.get("item_id")
        video_id = job.get("video_id")
        source_url = job.get("source_url") or f"https://www.youtube.com/watch?v={video_id}"
        preferred_model = job.get("preferred_model") or self.default_model

        logger.info(f"Processing Job #{job_id} for Item '{item_id}' ({source_url})...")
        start_job_time = time.time()

        try:
            # 1. Extract direct audio stream URL
            stream_url, _ = self.extract_audio_stream_url(source_url)

            # 2. Decode audio in-memory to 16kHz float32 PCM
            audio_data, duration_seconds = self.decode_audio_to_pcm(stream_url)
            logger.info(
                f"Decoded {duration_seconds:.1f}s audio in-memory ({len(audio_data)} samples)."
            )

            # 3. Transcribe via Apple MLX Whisper on Metal GPU
            transcription = self.transcribe_audio(audio_data, model_name=preferred_model)
            raw_result = transcription["result"]
            latency = transcription["latency_seconds"]
            realtime_factor = round(duration_seconds / max(0.01, latency), 1)

            # 4. Format segments and continuous text
            raw_segments = raw_result.get("segments", [])
            segments: List[Dict[str, Any]] = []
            for seg in raw_segments:
                segments.append({
                    "start": seg.get("start"),
                    "end": seg.get("end"),
                    "text": seg.get("text", "").strip(),
                    "confidence": None,
                })

            full_text = raw_result.get("text", "").strip()
            detected_language = raw_result.get("language", "en")

            logger.info(
                f"Transcribed {duration_seconds:.1f}s in {latency:.2f}s ({realtime_factor}x RTF). Words: {len(full_text.split())}."
            )

            # 5. Post completion to Hetzner
            complete_payload = {
                "jobId": job_id,
                "itemId": item_id,
                "fullText": full_text,
                "language": detected_language,
                "segments": segments,
                "workerName": self.worker_id,
                "workerMetadata": {
                    "engine": "mlx-whisper",
                    "model": transcription["model_used"],
                    "compute_device": "Apple Silicon Metal GPU",
                    "audio_duration_seconds": duration_seconds,
                    "inference_latency_seconds": round(latency, 2),
                    "realtime_factor": f"{realtime_factor}x",
                    "host": self.hostname,
                    "total_job_latency_seconds": round(time.time() - start_job_time, 2),
                },
            }

            res = requests.post(
                f"{self.server_url}/api/worker/transcript-jobs/complete",
                json=complete_payload,
                headers=self.get_headers(),
                timeout=30,
            )

            if res.status_code == 200:
                logger.info(f"✅ Job #{job_id} completed and ingested successfully!")
                return True
            else:
                logger.error(f"Failed to submit completion: HTTP {res.status_code} {res.text}")
                return False

        except Exception as e:
            logger.error(f"❌ Job #{job_id} execution error: {e}", exc_info=True)
            self._report_failure(job_id, item_id, str(e))
            return False

    def _report_failure(self, job_id: int, item_id: str, error_msg: str) -> None:
        if not requests:
            return
        payload = {
            "jobId": job_id,
            "itemId": item_id,
            "errorCode": "mac_worker_error",
            "errorMessage": error_msg[:1000],
            "retryable": True,
            "workerName": self.worker_id,
        }
        try:
            requests.post(
                f"{self.server_url}/api/worker/transcript-jobs/fail",
                json=payload,
                headers=self.get_headers(),
                timeout=15,
            )
        except Exception as e:
            logger.warning(f"Could not report failure to server: {e}")

    def run(self) -> None:
        logger.info(f"Starting Mac ASR Pull-Worker Daemon ({self.worker_id})...")
        logger.info(f"Target Server: {self.server_url}")
        logger.info(f"Default Model: {self.default_model}")
        logger.info(f"System: {self.system_info}")

        # Initial heartbeat
        self.send_heartbeat()

        while self.running:
            try:
                # Periodic heartbeat
                if time.time() - self.last_heartbeat > self.heartbeat_interval:
                    self.send_heartbeat()

                # Check battery
                if self.is_battery_low():
                    time.sleep(30)
                    continue

                # Poll job
                job = self.poll_job()
                if job:
                    self.process_job(job)
                else:
                    time.sleep(self.poll_interval)

            except KeyboardInterrupt:
                logger.info("Received interrupt signal. Stopping daemon gracefully...")
                self.running = False
                break
            except Exception as e:
                logger.error(f"Unexpected loop exception: {e}", exc_info=True)
                time.sleep(self.poll_interval)

        logger.info("Mac ASR Pull-Worker Daemon stopped.")

    def stop(self) -> None:
        self.running = False


def main():
    worker = MacAsrWorker()

    def handle_signal(sig, frame):
        logger.info(f"Received signal {sig}. Initiating shutdown...")
        worker.stop()

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    worker.run()


if __name__ == "__main__":
    main()
