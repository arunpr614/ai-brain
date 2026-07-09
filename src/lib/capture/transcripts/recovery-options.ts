import type { ItemRow } from "@/db/client";
import type {
  TranscriptAcquisitionMethod,
  TranscriptEnvironment,
  TranscriptSourceRow,
} from "@/db/transcripts";
import { currentTranscriptEnvironment, isYoutubeItem } from "@/lib/capture/policy";

export type YoutubeTranscriptRecoveryOptionId =
  | "paste_transcript"
  | "upload_transcript_file"
  | "official_youtube_captions"
  | "owned_media_stt"
  | "public_extraction";

export type YoutubeTranscriptRecoveryOptionStatus =
  | "available"
  | "gated"
  | "blocked";

export type YoutubeTranscriptRecoveryStatusKind =
  | "needs_transcript"
  | "has_transcript"
  | "not_applicable";

export interface YoutubeTranscriptRecoveryOption {
  id: YoutubeTranscriptRecoveryOptionId;
  label: string;
  status: YoutubeTranscriptRecoveryOptionStatus;
  description: string;
  method: TranscriptAcquisitionMethod;
  actionLabel?: string;
  href?: string;
  requires: string;
  blocker?: string;
  evidence: string;
}

export interface YoutubeTranscriptRecoveryStatus {
  isYoutube: boolean;
  status: YoutubeTranscriptRecoveryStatusKind;
  hasActiveTranscript: boolean;
  headline: string;
  summary: string;
  primaryActionLabel: string;
  options: YoutubeTranscriptRecoveryOption[];
}

export interface BuildYoutubeTranscriptRecoveryStatusInput {
  item: ItemRow;
  activeTranscriptSource?: Pick<
    TranscriptSourceRow,
    | "source_kind"
    | "caption_source_class"
    | "timestamp_mode"
    | "segment_count"
    | "language_code"
  > | null;
  environment?: TranscriptEnvironment;
  officialCaptionsWired?: boolean;
  ownedMediaSttWired?: boolean;
  labPublicExtractionApproved?: boolean;
  repairHref?: string;
}

export function buildYoutubeTranscriptRecoveryStatus(
  input: BuildYoutubeTranscriptRecoveryStatusInput,
): YoutubeTranscriptRecoveryStatus {
  const isYoutube = isYoutubeItem(input.item);
  if (!isYoutube) {
    return {
      isYoutube: false,
      status: "not_applicable",
      hasActiveTranscript: false,
      headline: "YouTube transcript recovery is not applicable",
      summary: "This source is not a YouTube capture.",
      primaryActionLabel: "Add text",
      options: [],
    };
  }

  const hasActiveTranscript = Boolean(input.activeTranscriptSource);
  const environment = input.environment ?? currentTranscriptEnvironment();
  const repairHref = input.repairHref ?? `/items/${input.item.id}/repair`;
  const primaryActionLabel = hasActiveTranscript ? "Replace transcript" : "Add transcript";

  return {
    isYoutube: true,
    status: hasActiveTranscript ? "has_transcript" : "needs_transcript",
    hasActiveTranscript,
    headline: hasActiveTranscript
      ? "Transcript is attached"
      : "Transcript can be added",
    summary: hasActiveTranscript
      ? "This item already has an active transcript source. You can replace it with a pasted transcript or transcript file."
      : "Add a transcript directly now, or keep the gated routes visible for a future owned or authorized workflow.",
    primaryActionLabel,
    options: [
      {
        id: "paste_transcript",
        label: hasActiveTranscript ? "Replace with pasted transcript" : "Paste transcript",
        status: "available",
        description: hasActiveTranscript
          ? "Paste a corrected transcript and replace the active transcript source."
          : "Paste transcript text from a source you are allowed to save.",
        method: "user_paste",
        actionLabel: primaryActionLabel,
        href: `${repairHref}#text`,
        requires: "Transcript text supplied by the user.",
        evidence: "M0/M1A policy and repair flow stores user-provided transcript provenance.",
      },
      {
        id: "upload_transcript_file",
        label: hasActiveTranscript ? "Replace with transcript file" : "Upload transcript file",
        status: "available",
        description: hasActiveTranscript
          ? "Upload a corrected .vtt, .srt, .txt, or .md transcript and replace existing transcript segments."
          : "Upload a .vtt, .srt, .txt, or .md transcript file; timestamped files keep segment timing.",
        method: "uploaded_file",
        actionLabel: "Choose file",
        href: `${repairHref}#transcript_file`,
        requires: "User-supplied transcript file.",
        evidence: "M1B parses transcript files and stores timestamped segments when available.",
      },
      officialCaptionOption(input.officialCaptionsWired ?? false),
      ownedMediaSttOption(input.ownedMediaSttWired ?? false),
      publicExtractionOption({
        environment,
        labPublicExtractionApproved: input.labPublicExtractionApproved ?? false,
      }),
    ],
  };
}

function officialCaptionOption(
  officialCaptionsWired: boolean,
): YoutubeTranscriptRecoveryOption {
  return {
    id: "official_youtube_captions",
    label: "Official YouTube captions",
    status: "gated",
    description:
      "Use YouTube's official caption API only for a video you own or are authorized to manage.",
    method: "youtube_official_caption",
    requires: "YouTube OAuth, owned or authorized video permission, quota handling, and route wiring.",
    blocker: officialCaptionsWired
      ? "OAuth, token handling, quota behavior, and live authorized smoke must be reviewed before this screen can run it."
      : "Not wired in this product surface yet.",
    evidence:
      "YouTube captions.download requires authorization and permission to edit the video.",
  };
}

function ownedMediaSttOption(ownedMediaSttWired: boolean): YoutubeTranscriptRecoveryOption {
  return {
    id: "owned_media_stt",
    label: "Transcribe owned media",
    status: "gated",
    description:
      "Generate a transcript from media or audio the user supplies and attests they own or are authorized to process.",
    method: "owned_media_stt",
    requires:
      "Owned-media upload UX, media storage or stream handoff, STT provider credentials, chunking, cost controls, and privacy review.",
    blocker: ownedMediaSttWired
      ? "Upload/provider wiring and live owned-media smoke must be reviewed before this screen can run it."
      : "Not wired in this product surface yet.",
    evidence:
      "M3 validates bounded user-supplied media metadata and never passes YouTube URLs or remote media locations into STT.",
  };
}

function publicExtractionOption(input: {
  environment: TranscriptEnvironment;
  labPublicExtractionApproved: boolean;
}): YoutubeTranscriptRecoveryOption {
  const labApproved = input.environment === "lab" && input.labPublicExtractionApproved;
  return {
    id: "public_extraction",
    label: "Public YouTube transcript extraction",
    status: labApproved ? "gated" : "blocked",
    description: labApproved
      ? "Lab-only extraction approval exists, but this is not a production recovery route."
      : "Automatic public YouTube transcript extraction is not available in production.",
    method: "lab_public_caption",
    requires: "Legal/platform approval and separate lab-only execution controls.",
    blocker: labApproved
      ? "Lab-only approval does not create a production user action."
      : "Blocked unless a legal/platform-approved lab path exists.",
    evidence:
      "S02 and related browser-mediated work remain lab-only or blocked without legal/platform approval.",
  };
}
