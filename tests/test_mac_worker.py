"""
test_mac_worker.py — Unit and integration tests for src/mac_worker.py daemon.
"""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Ensure src is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

from mac_worker import MacAsrWorker


class TestMacAsrWorker(unittest.TestCase):
    def setUp(self):
        self.worker = MacAsrWorker(
            server_url="http://127.0.0.1:3000",
            token="test_worker_token_12345",
            worker_id="test-mac-worker",
            default_model="mlx-community/whisper-large-v3-turbo",
            poll_interval=1.0,
            heartbeat_interval=60.0,
        )

    def test_headers_and_auth(self):
        headers = self.worker.get_headers()
        self.assertEqual(headers["Content-Type"], "application/json")
        self.assertEqual(headers["x-worker-name"], "test-mac-worker")
        self.assertEqual(headers["Authorization"], "Bearer test_worker_token_12345")

    def test_system_info_detection(self):
        info = self.worker.system_info
        self.assertTrue(len(info) > 0)
        self.assertIn("Apple Silicon", info)

    @patch("mac_worker.requests")
    def test_send_heartbeat(self, mock_requests):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_requests.post.return_value = mock_response

        ok = self.worker.send_heartbeat()
        self.assertTrue(ok)
        mock_requests.post.assert_called_once()
        args, kwargs = mock_requests.post.call_args
        self.assertEqual(args[0], "http://127.0.0.1:3000/api/worker/transcript-jobs/heartbeat")
        self.assertEqual(kwargs["json"]["workerId"], "test-mac-worker")

    @patch("mac_worker.requests")
    def test_poll_job_empty(self, mock_requests):
        mock_response = MagicMock()
        mock_response.status_code = 204
        mock_requests.get.return_value = mock_response

        job = self.worker.poll_job()
        self.assertIsNone(job)

    @patch("mac_worker.requests")
    def test_poll_job_success(self, mock_requests):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "job": {
                "id": 42,
                "item_id": "item_123",
                "video_id": "dQw4w9WgXcQ",
                "title": "Never Gonna Give You Up",
                "priority": 100,
            }
        }
        mock_requests.get.return_value = mock_response

        job = self.worker.poll_job()
        self.assertIsNotNone(job)
        self.assertEqual(job["id"], 42)
        self.assertEqual(job["item_id"], "item_123")

    @patch("mac_worker.psutil")
    def test_battery_low_detection(self, mock_psutil):
        # Case 1: Plugged in -> Not low
        mock_battery = MagicMock()
        mock_battery.power_plugged = True
        mock_battery.percent = 8.0
        mock_psutil.sensors_battery.return_value = mock_battery
        self.assertFalse(self.worker.is_battery_low())

        # Case 2: On battery, 8% -> Low
        mock_battery.power_plugged = False
        mock_battery.percent = 8.0
        self.assertTrue(self.worker.is_battery_low())

        # Case 3: On battery, 80% -> Not low
        mock_battery.percent = 80.0
        self.assertFalse(self.worker.is_battery_low())

    @patch("mac_worker.requests")
    @patch.object(MacAsrWorker, "extract_audio_stream_url")
    @patch.object(MacAsrWorker, "decode_audio_to_pcm")
    @patch.object(MacAsrWorker, "transcribe_audio")
    def test_process_job_flow(
        self,
        mock_transcribe,
        mock_decode,
        mock_extract,
        mock_requests,
    ):
        mock_extract.return_value = ("https://audio.googlevideo.com/videoplayback?...", "Test Video")
        mock_decode.return_value = (MagicMock(), 120.0)
        mock_transcribe.return_value = {
            "result": {
                "text": "Hello world from M5 Pro.",
                "language": "en",
                "segments": [{"start": 0.0, "end": 2.0, "text": "Hello world from M5 Pro."}],
            },
            "latency_seconds": 2.5,
            "model_used": "mlx-community/whisper-large-v3-turbo",
        }

        mock_complete_resp = MagicMock()
        mock_complete_resp.status_code = 200
        mock_requests.post.return_value = mock_complete_resp

        job = {
            "id": 101,
            "item_id": "item_abc",
            "video_id": "testvideo12",
            "source_url": "https://www.youtube.com/watch?v=testvideo12",
            "preferred_model": "whisper-large-v3-turbo",
        }

        success = self.worker.process_job(job)
        self.assertTrue(success)

        mock_requests.post.assert_called_once()
        _, kwargs = mock_requests.post.call_args
        payload = kwargs["json"]
        self.assertEqual(payload["jobId"], 101)
        self.assertEqual(payload["itemId"], "item_abc")
        self.assertEqual(payload["fullText"], "Hello world from M5 Pro.")
        self.assertEqual(len(payload["segments"]), 1)
        self.assertEqual(payload["workerMetadata"]["engine"], "mlx-whisper")


if __name__ == "__main__":
    unittest.main()
