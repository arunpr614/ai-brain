"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Play,
  Pause,
  BookOpen,
  Sparkles,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  ExternalLink,
  Copy,
  ChevronRight,
  Search,
  MessageSquare,
  Tv,
  Sun,
  Moon,
  Smartphone,
  Tablet,
  Laptop,
  Zap,
  X,
  Send,
  Archive,
  Inbox,
  HelpCircle,
  Activity,
  RefreshCw,
  Wrench,
  AlertOctagon,
  Terminal,
  Layers,
  Sparkle,
  Share2,
  Edit3,
  Eye,
  Square,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/cn";

// ==========================================
// TYPES & DATA CONTRACTS
// ==========================================

export type PrototypeView = "repair-center" | "processing-stream" | "reading-studio";
export type ViewportMode = "desktop" | "tablet" | "mobile";
export type QualityTier = "gold" | "degraded" | "blocked" | "repaired";
export type SourceKind = "asr" | "recall" | "doc" | "chat" | "synth";
export type AsrJobState = "idle" | "queuing" | "transcribing" | "aligning" | "completed";

export interface TranscriptSegment {
  id: number;
  startSec: number;
  endSec: number;
  timestamp: string;
  speaker: string;
  text: string;
  confidence: number;
}

export interface RepairItem {
  id: string;
  title: string;
  kind: "youtube" | "article" | "podcast" | "pdf";
  sourceUrl: string;
  channelOrAuthor: string;
  channelMetadata: string;
  thumbnailUrl?: string;
  durationOrReadTime: string;
  durationSeconds?: number;
  capturedAt: string;
  qualityTier: QualityTier;
  failureCategory: "youtube-429" | "paywall-preview" | "timestamp-drift";
  failureTitle: string;
  failureReason: string;
  technicalDetails: {
    httpStatus: number;
    scraperEngine: string;
    audioExtracted: boolean;
    audioDuration: string;
    cachedAudioSizeMb: number;
    missingFields: string[];
    suggestedFix: string;
  };
  asrState: AsrJobState;
  asrProgress: number;
  asrSpeedMultiplier: number;
  asrEtaSeconds: number;
  selectedForBatch: boolean;
  tags: string[];
  summary: string;
  keyQuotes: string[];
  segments?: TranscriptSegment[];
  articleHtml?: string[];
}

export interface StreamItem {
  id: string;
  title: string;
  sourceKind: SourceKind;
  kindBadgeLabel: string;
  sourceUrl: string;
  authorOrHost: string;
  publication: string;
  capturedAt: string;
  relativeTime: string;
  readOrDuration: string;
  durationSeconds?: number;
  qualityTier: QualityTier;
  status: "unread" | "processing" | "synthesized" | "archived";
  executiveSummary: string;
  keyInsights: string[];
  entityChips: string[];
  tags: string[];
  topics: string[];
  collections: string[];
  segments?: TranscriptSegment[];
  articleHtml?: string[];
  aiSynthesizing?: boolean;
}

// ==========================================
// MOCK DATASETS
// ==========================================

const INITIAL_REPAIR_ITEMS: RepairItem[] = [
  {
    id: "rep-1",
    title: "Lex Fridman Podcast #410 — Yann LeCun: World Models, JEPA & Auto-Regressive Limits",
    kind: "youtube",
    sourceUrl: "https://youtube.com/watch?v=5t1vM85203Y",
    channelOrAuthor: "Lex Fridman",
    channelMetadata: "4.1M subscribers • Tech & Science Podcast",
    durationOrReadTime: "42:15",
    durationSeconds: 2535,
    capturedAt: "Today at 09:15 AM",
    qualityTier: "blocked",
    failureCategory: "youtube-429",
    failureTitle: "YouTube Anti-Bot Blocked (HTTP 429)",
    failureReason: "Automated timed-text scraper encountered rate-limit challenge. Captions unavailable via cloud fetch.",
    technicalDetails: {
      httpStatus: 429,
      scraperEngine: "yt-dlp / cloud-caption-extract v2.14",
      audioExtracted: true,
      audioDuration: "42m 15s",
      cachedAudioSizeMb: 38.6,
      missingFields: ["timed_transcript_vtt", "word_timestamps", "speaker_diarization"],
      suggestedFix: "Run local Mac Apple Neural Engine Whisper Base/Medium ASR. Audio is already cached locally.",
    },
    asrState: "idle",
    asrProgress: 0,
    asrSpeedMultiplier: 28.4,
    asrEtaSeconds: 32,
    selectedForBatch: true,
    tags: ["world-models", "jepa", "yann-lecun", "ai-debate"],
    summary:
      "Yann LeCun argues that auto-regressive next-token prediction cannot achieve human-level intelligence due to compounding error rates. He proposes Joint Embedding Predictive Architecture (JEPA) as a hierarchical world-model foundation.",
    keyQuotes: [
      "Auto-regressive generation is fundamentally doomed to wander off into hallucination space over long horizons.",
      "Animals and humans learn how the physical world works through passive observation before acquiring language.",
    ],
    segments: [],
  },
  {
    id: "rep-2",
    title: "Stanford CS229: Machine Learning — Lecture 01: Supervised Learning & Loss Optimization",
    kind: "youtube",
    sourceUrl: "https://youtube.com/watch?v=jGwO_UgTS7I",
    channelOrAuthor: "Stanford Online",
    channelMetadata: "1.8M subscribers • Academic Lecture",
    durationOrReadTime: "58:30",
    durationSeconds: 3510,
    capturedAt: "Yesterday at 16:40",
    qualityTier: "blocked",
    failureCategory: "youtube-429",
    failureTitle: "YouTube Anti-Bot Blocked (HTTP 429)",
    failureReason: "CAPTCHA challenge injected into stream manifest. Cloud worker timed out after 3 retries.",
    technicalDetails: {
      httpStatus: 429,
      scraperEngine: "yt-dlp / cloud-caption-extract v2.14",
      audioExtracted: true,
      audioDuration: "58m 30s",
      cachedAudioSizeMb: 53.2,
      missingFields: ["timed_transcript_vtt", "speaker_turns"],
      suggestedFix: "Execute Mac Local CoreML Whisper Medium for 100% transcript recovery with equation alignment.",
    },
    asrState: "idle",
    asrProgress: 0,
    asrSpeedMultiplier: 26.8,
    asrEtaSeconds: 44,
    selectedForBatch: true,
    tags: ["machine-learning", "stanford", "loss-functions", "gradient-descent"],
    summary:
      "Foundational lecture introducing supervised learning paradigms, batch gradient descent formulations, convex cost functions, and normal equation derivations.",
    keyQuotes: [
      "Machine learning is the field of study that gives computers the ability to learn without being explicitly programmed.",
    ],
    segments: [],
  },
  {
    id: "rep-3",
    title: "Ilya Sutskever — Keynote at NeurIPS: Next Frontiers of Scaling & Superalignment",
    kind: "youtube",
    sourceUrl: "https://youtube.com/watch?v=Yeu4bM0vLKo",
    channelOrAuthor: "NeurIPS Conference",
    channelMetadata: "320K subscribers • Keynote Stream",
    durationOrReadTime: "31:20",
    durationSeconds: 1880,
    capturedAt: "Aug 16, 2026 at 11:30",
    qualityTier: "blocked",
    failureCategory: "youtube-429",
    failureTitle: "YouTube Anti-Bot Blocked (HTTP 429)",
    failureReason: "Live stream archive lacked automatic caption generation headers at capture time.",
    technicalDetails: {
      httpStatus: 429,
      scraperEngine: "yt-dlp / live-manifest-hook",
      audioExtracted: true,
      audioDuration: "31m 20s",
      cachedAudioSizeMb: 28.4,
      missingFields: ["timed_transcript_vtt", "segment_confidence"],
      suggestedFix: "Mac Whisper ASR transcribes in ~22 seconds with Apple Neural Engine acceleration.",
    },
    asrState: "idle",
    asrProgress: 0,
    asrSpeedMultiplier: 31.2,
    asrEtaSeconds: 22,
    selectedForBatch: true,
    tags: ["superalignment", "scaling-laws", "transformers", "ilya-sutskever"],
    summary:
      "Ilya Sutskever reflects on the progression from AlexNet to modern frontier LLMs, discussing post-scaling bottlenecks and automated empirical superalignment.",
    keyQuotes: [
      "If you predict the next token accurately enough, you are forced to build an internal world model.",
    ],
    segments: [],
  },
  {
    id: "rep-4",
    title: "Financial Times: The Trillion-Dollar Race for Custom Silicon & Custom ASIC Interconnects",
    kind: "article",
    sourceUrl: "https://ft.com/content/custom-ai-silicon-interconnects-2026",
    channelOrAuthor: "Financial Times Tech Guild",
    channelMetadata: "FT Premium • Peer-Reviewed Analysis",
    durationOrReadTime: "8 min read",
    capturedAt: "Today at 08:20 AM",
    qualityTier: "degraded",
    failureCategory: "paywall-preview",
    failureTitle: "Paywall Preview Only (Reader Truncated)",
    failureReason: "Web scraper extracted only the first 2 lead paragraphs (320 words out of 2,400). Paywall barrier triggered.",
    technicalDetails: {
      httpStatus: 200,
      scraperEngine: "Mozilla Readability / Cheerio v1.2",
      audioExtracted: false,
      audioDuration: "N/A",
      cachedAudioSizeMb: 0,
      missingFields: ["full_body_text", "embedded_charts", "analyst_tables"],
      suggestedFix: "Re-hydrate capture with active authenticated browser session cookie or import PDF whitepaper.",
    },
    asrState: "idle",
    asrProgress: 0,
    asrSpeedMultiplier: 0,
    asrEtaSeconds: 0,
    selectedForBatch: false,
    tags: ["semiconductors", "asic", "nvidia", "hyperscalers", "financial-times"],
    summary:
      "An investigative report on how hyperscalers (Google TPU v6, AWS Trainium3, Meta MTIA) are aggressively deploying proprietary optical interconnects to reduce dependence on off-the-shelf GPU clusters.",
    keyQuotes: [
      "The true moat in large-scale AI is no longer the raw FLOPs per chip, but the cost and thermal envelope of inter-rack interconnects.",
    ],
    articleHtml: [
      "Silicon Valley hyperscalers have committed over $180 billion toward custom ASIC silicon architectures in 2026 alone.",
      "[PAYWALL BARRIER TRUNCATED: Full subscriber text required to view remaining 16 sections, wafer-scale cost breakdowns, and interconnect latency benchmarks.]",
    ],
  },
  {
    id: "rep-5",
    title: "Stratechery by Ben Thompson: Aggregation Theory & Causal Reasoning in the Agentic AI Era",
    kind: "article",
    sourceUrl: "https://stratechery.com/2026/aggregation-theory-and-agentic-reasoning/",
    channelOrAuthor: "Ben Thompson",
    channelMetadata: "Stratechery Daily Update",
    durationOrReadTime: "12 min read",
    capturedAt: "Yesterday at 19:10",
    qualityTier: "degraded",
    failureCategory: "paywall-preview",
    failureTitle: "Paywall Preview Only (Reader Truncated)",
    failureReason: "Subscriber-only token missing from HTTP request header. Only introductory thesis captured.",
    technicalDetails: {
      httpStatus: 200,
      scraperEngine: "Puppeteer Headless DOM Extractor",
      audioExtracted: false,
      audioDuration: "N/A",
      cachedAudioSizeMb: 0,
      missingFields: ["subscriber_body_text", "diagram_svgs"],
      suggestedFix: "Click 'Re-fetch with Stratechery Cookie' or paste subscriber magic link.",
    },
    asrState: "idle",
    asrProgress: 0,
    asrSpeedMultiplier: 0,
    asrEtaSeconds: 0,
    selectedForBatch: false,
    tags: ["aggregation-theory", "business-models", "agentic-ai", "stratechery"],
    summary:
      "Ben Thompson evaluates whether autonomous AI agents break traditional two-sided marketplace dynamics by commoditizing the discovery and checkout layer.",
    keyQuotes: [
      "When the user's agent makes all purchase and research decisions, the value of brand UI collapses into raw API reliability.",
    ],
    articleHtml: [
      "For twenty years, Aggregation Theory explained why platforms like Google, Apple, and Amazon held insurmountable leverage over suppliers.",
      "[SUBSCRIBER GATE: Remaining 2,100 words locked behind Stratechery Plus credential.]",
    ],
  },
  {
    id: "rep-6",
    title: "Latent Space Podcast: Local-First Models, vLLM PagedAttention & Speculative Decoding",
    kind: "podcast",
    sourceUrl: "https://latentspace.fm/episodes/speculative-decoding-vllm",
    channelOrAuthor: "Swyx & Alessio Fanelli",
    channelMetadata: "AI Engineer Foundation • Podcast",
    durationOrReadTime: "36:40",
    durationSeconds: 2200,
    capturedAt: "Aug 15, 2026 at 14:00",
    qualityTier: "degraded",
    failureCategory: "timestamp-drift",
    failureTitle: "Missing Audio Timestamps / Raw VTT Drift",
    failureReason: "Supplied WebVTT file had missing start/end offsets. Text exists as one giant 14,000-word monolith without scrub markers.",
    technicalDetails: {
      httpStatus: 200,
      scraperEngine: "RSS Feed WebVTT Importer",
      audioExtracted: true,
      audioDuration: "36m 40s",
      cachedAudioSizeMb: 32.1,
      missingFields: ["word_level_timestamps", "sentence_boundaries"],
      suggestedFix: "Run CTC Forced Alignment on local Mac to compute exact segment time offsets in ~6 seconds.",
    },
    asrState: "idle",
    asrProgress: 0,
    asrSpeedMultiplier: 45.0,
    asrEtaSeconds: 6,
    selectedForBatch: true,
    tags: ["speculative-decoding", "vllm", "paged-attention", "latent-space"],
    summary:
      "A deep technical breakdown of inference latency optimizations: draft model speculative decoding, PagedAttention memory fragmentation reduction, and continuous batching.",
    keyQuotes: [
      "Speculative decoding gives you a 2x-3x wall-clock speedup on token generation with zero loss in mathematical output distribution.",
    ],
    segments: [],
  },
  {
    id: "rep-7",
    title: "Dwarkesh Podcast: Sholto Douglas on Interpreting Transformer Circuits & Superposition",
    kind: "podcast",
    sourceUrl: "https://dwarkeshpatel.com/p/sholto-douglas",
    channelOrAuthor: "Dwarkesh Patel",
    channelMetadata: "The Lunar Society Podcast",
    durationOrReadTime: "52:10",
    durationSeconds: 3130,
    capturedAt: "Aug 14, 2026 at 18:30",
    qualityTier: "degraded",
    failureCategory: "timestamp-drift",
    failureTitle: "Missing Audio Timestamps / Raw VTT Drift",
    failureReason: "Auto-generated YouTube captions had cumulative +4.8s drift due to unhandled audio sample-rate conversion.",
    technicalDetails: {
      httpStatus: 200,
      scraperEngine: "YouTube VTT Sync Parser",
      audioExtracted: true,
      audioDuration: "52m 10s",
      cachedAudioSizeMb: 46.8,
      missingFields: ["drift_corrected_timestamps", "speaker_turns"],
      suggestedFix: "Re-align with Mac Neural Engine Whisper CTC alignment tool.",
    },
    asrState: "idle",
    asrProgress: 0,
    asrSpeedMultiplier: 38.0,
    asrEtaSeconds: 12,
    selectedForBatch: true,
    tags: ["mechanistic-interpretability", "circuits", "anthropic", "superposition"],
    summary:
      "Sholto Douglas explains how sparse autoencoders (SAEs) allow researchers to decompose polysemantic neurons into interpretable, mono-semantic feature vectors.",
    keyQuotes: [
      "Superposition is nature's way of packing a million concepts into a thousand dimensional activation space.",
    ],
    segments: [],
  },
];

const INITIAL_STREAM_ITEMS: StreamItem[] = [
  {
    id: "str-1",
    title: "Andrej Karpathy — Deep Dive into LLMs: Tokenization, Pretraining, SFT & RLHF",
    sourceKind: "asr",
    kindBadgeLabel: "⚡ ASR",
    sourceUrl: "https://youtube.com/watch?v=zjkBMFhNj_g",
    authorOrHost: "Andrej Karpathy",
    publication: "YouTube AI Researcher",
    capturedAt: "Aug 18, 2026 • 11:24 AM",
    relativeTime: "12m ago",
    readOrDuration: "18:42",
    durationSeconds: 1122,
    qualityTier: "gold",
    status: "unread",
    executiveSummary:
      "A masterclass explaining modern Large Language Models end-to-end. Covers Byte-Pair Encoding (BPE) tokenization quirks, self-attention neural dynamics, massive 15T token pretraining distribution, supervised fine-tuning (SFT), and post-training alignment through RLHF and DPO.",
    keyInsights: [
      "Tokenization is the root cause of arithmetic and spelling failures in LLMs.",
      "Pretraining compresses a vast chunk of the web into parameters; SFT/RLHF teach the model conversational protocols.",
      "Direct Preference Optimization (DPO) achieves alignment without training a separate unstable reward model.",
    ],
    entityChips: ["Byte-Pair Encoding", "Transformers", "SFT", "RLHF", "DPO", "Cross-Entropy Loss"],
    tags: ["ai-research", "transformers", "alignment", "llm-internals"],
    topics: ["Tokenization", "Transformer Architecture", "Alignment"],
    collections: ["AI Deep Dives", "Stanford AI 2026"],
    segments: [
      {
        id: 1,
        startSec: 0,
        endSec: 75,
        timestamp: "00:00",
        speaker: "Andrej Karpathy",
        text: "Hi everyone! In this lecture, we're going to dive deep into how large language models work under the hood, starting from raw unicode characters all the way to conversational agents.",
        confidence: 0.99,
      },
      {
        id: 2,
        startSec: 75,
        endSec: 180,
        timestamp: "01:15",
        speaker: "Andrej Karpathy",
        text: "First, let's talk about Tokenization. Many people think LLMs see words, but they actually see discrete integer token IDs generated by Byte-Pair Encoding (BPE).",
        confidence: 0.98,
      },
      {
        id: 3,
        startSec: 180,
        endSec: 320,
        timestamp: "03:00",
        speaker: "Andrej Karpathy",
        text: "If you've ever wondered why LLMs struggle with basic spelling or why reversing a word fails, it's almost always tokenization. Words like 'egg' might be a single token, obscuring the letters inside.",
        confidence: 0.99,
      },
      {
        id: 4,
        startSec: 320,
        endSec: 465,
        timestamp: "05:20",
        speaker: "Andrej Karpathy",
        text: "Now moving to Pretraining. We are training a 70-billion parameter transformer on roughly 15 trillion tokens. We use next-token prediction with cross-entropy loss over thousands of GPUs.",
        confidence: 0.97,
      },
      {
        id: 5,
        startSec: 465,
        endSec: 670,
        timestamp: "07:45",
        speaker: "Andrej Karpathy",
        text: "The base model after pretraining is just a document completer. Supervised Fine-Tuning (SFT) swaps the objective to conversational question-and-answer pairs, teaching dialogue structure.",
        confidence: 0.99,
      },
      {
        id: 6,
        startSec: 670,
        endSec: 880,
        timestamp: "11:10",
        speaker: "Andrej Karpathy",
        text: "Finally, Direct Preference Optimization (DPO) aligns model completions with human preference rankings, penalizing hallucinations while rewarding conciseness and safety.",
        confidence: 0.98,
      },
    ],
  },
  {
    id: "str-2",
    title: "Martin Fowler & Architecture Guild: Patterns of Distributed Systems & Local-First CRDTs",
    sourceKind: "recall",
    kindBadgeLabel: "📥 Recall",
    sourceUrl: "https://martinfowler.com/articles/patterns-local-first-crdt.html",
    authorOrHost: "Martin Fowler",
    publication: "Thoughtworks Engineering Blog",
    capturedAt: "Aug 18, 2026 • 10:48 AM",
    relativeTime: "48m ago",
    readOrDuration: "6 min read",
    qualityTier: "gold",
    status: "unread",
    executiveSummary:
      "A comprehensive architectural blueprint for local-first applications. Details state-based vs operation-based CRDTs, delta mutation replication, causal ordering via vector clocks, and pragmatic SQLite WAL merging techniques.",
    keyInsights: [
      "Local-first is fundamentally about 0ms interaction latency and user data ownership.",
      "Tombstone pruning requires consensus garbage collection to prevent unbounded SQLite file growth.",
      "Delta-state CRDTs drastically reduce bandwidth compared to full state exchanges.",
    ],
    entityChips: ["CRDT", "SQLite WAL", "Vector Clocks", "Tombstones", "Local-First"],
    tags: ["distributed-systems", "crdt", "sqlite", "offline-first"],
    topics: ["Distributed State", "Vector Clocks", "Data Synchronization"],
    collections: ["Software Architecture", "Local-First AI Research"],
    articleHtml: [
      "In modern software engineering, the dominance of centralized cloud architecture is being re-examined. Applications that keep user data on remote servers create network latency, fragility under spotty connectivity, and privacy concerns.",
      "Local-First software turns this hierarchy upside down: data is stored locally on the user's primary device (e.g. via embedded SQLite or IndexedDB), operations are immediately committed with 0ms perceived latency, and background synchronization happens asynchronously via Conflict-Free Replicated Data Types (CRDTs).",
      "Key Architectural Patterns:",
      "1. State-Based vs Op-Based CRDTs: Op-based synchronization sends lightweight delta mutation logs across peers, reducing bandwidth while requiring guaranteed causal delivery.",
      "2. Vector Clocks & Causal History: Tracking causal dependencies across multiple devices ensures conflicting edits to rich markdown or document trees are merged deterministically.",
      "3. Tombstone Pruning: When users delete items or text blocks, tombstone records must linger until all registered peers acknowledge the deletion, after which a consensus garbage collection cycle purges them.",
    ],
  },
  {
    id: "str-3",
    title: "Anthropic Research: Constitutional AI — Harmlessness from AI Feedback & Self-Correction",
    sourceKind: "doc",
    kindBadgeLabel: "📄 DOC",
    sourceUrl: "https://anthropic.com/research/constitutional-ai-harmlessness",
    authorOrHost: "Yuntao Bai, Saurav Kadavath et al.",
    publication: "Anthropic Whitepaper (34 pages)",
    capturedAt: "Aug 18, 2026 • 09:12 AM",
    relativeTime: "2h ago",
    readOrDuration: "14 min read",
    qualityTier: "gold",
    status: "synthesized",
    executiveSummary:
      "Anthropic presents Constitutional AI (CAI), a method for training helpful and harmless AI assistants without relying heavily on human feedback for harmful queries. Instead, a list of written principles (the constitution) guides automated self-critique and revision.",
    keyInsights: [
      "RLAIF (Reinforcement Learning from AI Feedback) scales supervision without human crowdworker fatigue.",
      "Self-correction loops allow models to evaluate their own intermediate tokens against safety rules.",
      "Transparency of the constitution makes alignment principles auditable by external researchers.",
    ],
    entityChips: ["RLAIF", "Constitutional AI", "Critique & Revision", "Safety Alignment"],
    tags: ["anthropic", "safety", "rlaif", "constitutional-ai"],
    topics: ["AI Safety", "RLAIF", "Self-Correction"],
    collections: ["AI Deep Dives", "Anthropic Papers"],
  },
  {
    id: "str-4",
    title: "Claude 3.7 Sonnet Session: Designing a Zero-Copy SQLite Vector Extension in Rust",
    sourceKind: "chat",
    kindBadgeLabel: "💬 CHAT",
    sourceUrl: "claude-session-export-2026-08-18-0830",
    authorOrHost: "Claude 3.7 Sonnet",
    publication: "Developer Workspace Conversation",
    capturedAt: "Aug 18, 2026 • 08:30 AM",
    relativeTime: "3h ago",
    readOrDuration: "12 turns",
    qualityTier: "gold",
    status: "unread",
    executiveSummary:
      "A technical pairing session that designed a custom C-ABI SQLite virtual table extension in Rust for cosine and dot-product vector search, avoiding heap memory allocations during bulk KNN scans.",
    keyInsights: [
      "Using `sqlite3_blob_open` permits direct SIMD AVX-512 vector comparisons without copying byte buffers.",
      "Hierarchical Navigable Small World (HNSW) graphs can be partitioned into SQLite page blobs for persistent indexing.",
      "Achieved 14,200 QPS on 1536-dimensional embeddings on Apple M3 Max.",
    ],
    entityChips: ["Rust", "SQLite Extension", "SIMD", "HNSW", "Zero-Copy"],
    tags: ["rust", "sqlite", "vector-db", "performance"],
    topics: ["Database Internals", "SIMD Acceleration", "Vector Indexing"],
    collections: ["Local-First AI Research"],
  },
  {
    id: "str-5",
    title: "AI Architectural Digest #42: Speculative Decoding, KV Cache Compression & FlashAttention-3",
    sourceKind: "synth",
    kindBadgeLabel: "🧠 SYNTH",
    sourceUrl: "ai-brain-digest-aug-week3",
    authorOrHost: "AI Brain Synthesis Engine",
    publication: "Automated Weekly Intelligence",
    capturedAt: "Aug 18, 2026 • 07:00 AM",
    relativeTime: "4h ago",
    readOrDuration: "5 min read",
    qualityTier: "gold",
    status: "synthesized",
    executiveSummary:
      "Automated cross-document synthesis synthesizing 18 papers and podcasts captured this week. Analyzes how FP8 matrix engines in Hopper/Blackwell GPUs combined with FlashAttention-3 unlock 400k token context windows at production economics.",
    keyInsights: [
      "KV cache memory bandwidth is now the single largest cost bottleneck in LLM serving.",
      "PagedAttention + Speculative decoding reduces GPU memory residency by up to 64%.",
      "FlashAttention-3 leverages asynchronous Tensor Core TMA instructions for 1.8x speedup over FA2.",
    ],
    entityChips: ["FlashAttention-3", "KV Cache", "FP8", "Blackwell", "Speculative Decoding"],
    tags: ["synthesis", "inference-optimization", "gpu-hardware"],
    topics: ["LLM Inference", "Hardware Architecture", "Memory Management"],
    collections: ["Weekly Digests"],
  },
  {
    id: "str-6",
    title: "DeepSeek-V3 Technical Report: Multi-Head Latent Attention (MLA) & DualPipe MoE Scaling",
    sourceKind: "doc",
    kindBadgeLabel: "📄 DOC",
    sourceUrl: "https://deepseek.ai/papers/deepseek-v3.pdf",
    authorOrHost: "DeepSeek AI Research",
    publication: "Technical Whitepaper (48 pages)",
    capturedAt: "Aug 17, 2026 • 21:15",
    relativeTime: "14h ago",
    readOrDuration: "18 min read",
    qualityTier: "gold",
    status: "unread",
    executiveSummary:
      "DeepSeek-V3 introduces Multi-Head Latent Attention (MLA) which compresses the key-value cache by 93% via low-rank latent vector projections, and DualPipe parallel training for optimal computation-communication overlap in Mixture-of-Experts (MoE).",
    keyInsights: [
      "MLA compresses KV cache into a tiny latent vector, eliminating memory bottlenecks during long-context generation.",
      "DualPipe achieves near-zero pipeline bubbles across 2,048 GPU clusters.",
      "Auxiliary-loss-free load balancing ensures all MoE expert weights receive uniform token gradients.",
    ],
    entityChips: ["Multi-Head Latent Attention", "Mixture of Experts", "DualPipe", "DeepSeek-V3"],
    tags: ["deepseek", "moe", "attention-mechanisms", "open-weights"],
    topics: ["Model Architecture", "MoE Scaling", "Attention Compression"],
    collections: ["AI Deep Dives"],
  },
  {
    id: "str-7",
    title: "Dan Luu: Files Are Hard — Edge Cases in POSIX File Systems, Crash Consistency & SQLite WAL",
    sourceKind: "recall",
    kindBadgeLabel: "📥 Recall",
    sourceUrl: "https://danluu.com/file-consistency/",
    authorOrHost: "Dan Luu",
    publication: "Systems Engineering Essays",
    capturedAt: "Aug 17, 2026 • 15:40",
    relativeTime: "19h ago",
    readOrDuration: "9 min read",
    qualityTier: "gold",
    status: "unread",
    executiveSummary:
      "An exhaustive empirical investigation into filesystem semantics under sudden power loss. Evaluates how ext4, APFS, and ZFS handle fsync barriers, SQLite WAL checkpointing, and torn page writes.",
    keyInsights: [
      "Many modern OS filesystems do not guarantee rename atomicity unless explicit fsync flush barriers are invoked.",
      "SQLite WAL mode provides atomic transaction durability by appending updates to a sequential log before in-place B-tree writes.",
      "Torn writes occur when power fails mid-sector write on non-enterprise SSDs.",
    ],
    entityChips: ["POSIX", "fsync", "APFS", "SQLite WAL", "Crash Consistency"],
    tags: ["systems-programming", "storage", "sqlite", "operating-systems"],
    topics: ["Filesystems", "Database Reliability", "Storage Hardware"],
    collections: ["Software Architecture"],
  },
  {
    id: "str-8",
    title: "Stanford Seminar: Tri Dao — Hardware-Aware Algorithms, FlashAttention & Fast State-Space Models",
    sourceKind: "asr",
    kindBadgeLabel: "⚡ ASR",
    sourceUrl: "https://youtube.com/watch?v=hardware-aware-tri-dao",
    authorOrHost: "Tri Dao & Christopher Ré",
    publication: "Stanford MLSys Seminar",
    capturedAt: "Aug 16, 2026 • 17:00",
    relativeTime: "2d ago",
    readOrDuration: "45:10",
    durationSeconds: 2710,
    qualityTier: "gold",
    status: "unread",
    executiveSummary:
      "Tri Dao presents the hardware-aware algorithm design philosophy behind FlashAttention and Mamba (State Space Models). Explains how IO-awareness between SRAM and HBM drives real-world throughput gains over purely theoretical FLOP reductions.",
    keyInsights: [
      "GPU memory IO bandwidth is the true limiter; FLOPs are virtually free on modern Tensor Cores.",
      "Tiling intermediate softmax reduction steps directly in on-chip SRAM avoids costly HBM round-trips.",
      "State space models (SSMs) achieve linear time complexity O(N) by mapping recurrent equations into parallel scans.",
    ],
    entityChips: ["FlashAttention", "SRAM", "HBM Bandwidth", "State Space Models", "Mamba"],
    tags: ["mlsys", "hardware-aware", "stanford", "mamba"],
    topics: ["Hardware-Aware ML", "FlashAttention", "State Space Models"],
    collections: ["AI Deep Dives", "Stanford AI 2026"],
  },
];

// ==========================================
// MAIN COMPONENT
// ==========================================

export function Phase3SuitePrototype({ initialView = "repair-center" }: { initialView?: PrototypeView }) {
  // Global View / Navigation States
  const [activeView, setActiveView] = useState<PrototypeView>(initialView);
  const [viewportMode, setViewportMode] = useState<ViewportMode>("desktop");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // OPTION 1A (Capture Quality Repair Center) States
  const [repairItems, setRepairItems] = useState<RepairItem[]>(INITIAL_REPAIR_ITEMS);
  const [selectedRepairCategory, setSelectedRepairCategory] = useState<string>("all");
  const [repairSearchQuery, setRepairSearchQuery] = useState("");
  const [batchAsrActive, setBatchAsrActive] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [activeInspectItem, setActiveInspectItem] = useState<RepairItem | null>(null);

  // OPTION 2B (Processing Inbox & High-Velocity Stream) States
  const [streamItems, setStreamItems] = useState<StreamItem[]>(INITIAL_STREAM_ITEMS);
  const [activeStreamIndex, setActiveStreamIndex] = useState(0);
  const [streamFilterTab, setStreamFilterTab] = useState<"all" | "unread" | "synthesized" | "archived">("all");
  const [streamSearchQuery, setStreamSearchQuery] = useState("");
  const [quickPeekExpanded, setQuickPeekExpanded] = useState(true);
  const [lastArchivedItem, setLastArchivedItem] = useState<{ item: StreamItem; index: number } | null>(null);
  const [recentlySynthesizingId, setRecentlySynthesizingId] = useState<string | null>(null);
  const [activeKeyFlash, setActiveKeyFlash] = useState<string | null>(null);

  // Reading Studio Integrated Workspace States
  const [studioItem, setStudioItem] = useState<StreamItem>(INITIAL_STREAM_ITEMS[0]);
  const [studioPlaySec, setStudioPlaySec] = useState(75);
  const [isStudioPlaying, setIsStudioPlaying] = useState(false);
  const [studioActiveTab, setStudioActiveTab] = useState<"transcript" | "notes" | "ask" | "provenance">("transcript");
  const [studioSplitRatio, setStudioSplitRatio] = useState<"50-50" | "60-40" | "40-60">("50-50");
  const [studioNotes, setStudioNotes] = useState<string>(
    `# Key Research Takeaways\n\n- [x] Investigate Byte-Pair Encoding edge cases for multilingual vocabulary.\n- [ ] Compare DPO vs PPO stability in production serving pipelines.\n- [ ] Run benchmark evaluation of local Mac Neural Engine Whisper Base vs Large-v3.\n\n> "Tokenization is at the root of many mysterious LLM behaviors."`
  );
  const [studioAskInput, setStudioAskInput] = useState("");
  const [studioChatMessages, setStudioChatMessages] = useState<
    Array<{ role: "user" | "assistant"; text: string; citations?: Array<{ label: string; timeSec: number }> }>
  >([
    {
      role: "assistant",
      text: "Hello! I am your AI Memory Companion. Ask me to cross-reference timestamps, extract key formulas, or explain any segment.",
    },
    {
      role: "user",
      text: "Why does tokenization cause arithmetic failure in transformers?",
    },
    {
      role: "assistant",
      text: "As explained at 03:00, Byte-Pair Encoding merges multi-digit numbers into arbitrary token IDs. The model's attention heads cannot reliably inspect column-wise digits, causing basic multi-digit addition and subtraction to fail unless chain-of-thought scratchpads are used.",
      citations: [{ label: "03:00 BPE Tokenization Quirks", timeSec: 180 }],
    },
  ]);

  // UX Review Inspector Drawer State
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false);
  const [reviewTab, setReviewTab] = useState<"matrix" | "ergonomics" | "accessibility" | "benchmarks">("matrix");
  const [helpShortcutsOpen, setHelpShortcutsOpen] = useState(false);

  // Audio / Stream Reference for playback timer
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Toast Helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  }, []);

  // Flash Keyboard HUD key
  const triggerKeyFlash = useCallback((keyLabel: string) => {
    setActiveKeyFlash(keyLabel);
    setTimeout(() => {
      setActiveKeyFlash(null);
    }, 350);
  }, []);

  // Apply theme to DOM
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  }, [theme]);

  // Studio Audio Playback Simulation
  useEffect(() => {
    if (isStudioPlaying) {
      audioIntervalRef.current = setInterval(() => {
        setStudioPlaySec((prev) => {
          const maxSec = studioItem.durationSeconds || 1200;
          if (prev >= maxSec) {
            setIsStudioPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
    }
    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, [isStudioPlaying, studioItem]);

  // Filtered Stream Items
  const filteredStreamItems = useMemo(() => {
    return streamItems.filter((item) => {
      const matchesTab =
        streamFilterTab === "all"
          ? item.status !== "archived"
          : streamFilterTab === "unread"
          ? item.status === "unread"
          : streamFilterTab === "synthesized"
          ? item.status === "synthesized"
          : item.status === "archived";

      const matchesSearch =
        repairSearchQuery === "" ||
        item.title.toLowerCase().includes(streamSearchQuery.toLowerCase()) ||
        item.authorOrHost.toLowerCase().includes(streamSearchQuery.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(streamSearchQuery.toLowerCase()));

      return matchesTab && matchesSearch;
    });
  }, [streamItems, streamFilterTab, repairSearchQuery, streamSearchQuery]);

  const currentActiveStreamItem = filteredStreamItems[activeStreamIndex] || filteredStreamItems[0];

  // ==========================================
  // ACTION HANDLERS (Declared before useEffect)
  // ==========================================

  // Option 1A: Single Item Mac ASR Simulation
  const handleStartSingleAsr = useCallback((itemId: string) => {
    setRepairItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return { ...item, asrState: "queuing", asrProgress: 8 };
        }
        return item;
      })
    );
    showToast("Queued Apple Neural Engine Whisper ASR on Mac Local");

    // Stage 1: Queuing -> Transcribing
    setTimeout(() => {
      setRepairItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, asrState: "transcribing", asrProgress: 35 } : item))
      );
    }, 900);

    // Stage 2: Transcribing -> Aligning
    setTimeout(() => {
      setRepairItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, asrState: "aligning", asrProgress: 78 } : item))
      );
    }, 2200);

    // Stage 3: Completed -> Gold
    setTimeout(() => {
      setRepairItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              asrState: "completed",
              asrProgress: 100,
              qualityTier: "repaired",
              failureReason: "Successfully repaired via Mac Local Whisper Medium. 100% timed segments restored.",
              segments: [
                {
                  id: 1,
                  startSec: 0,
                  endSec: 45,
                  timestamp: "00:00",
                  speaker: item.channelOrAuthor,
                  text: `Recovered audio segment from ${item.title}. Speech waveforms verified with 0.99 confidence.`,
                  confidence: 0.99,
                },
                {
                  id: 2,
                  startSec: 45,
                  endSec: 120,
                  timestamp: "00:45",
                  speaker: item.channelOrAuthor,
                  text: "Neural Engine CTC alignment synchronized all phoneme boundaries with sub-millisecond precision.",
                  confidence: 0.98,
                },
              ],
            };
          }
          return item;
        })
      );
      showToast("✨ Mac Local ASR complete! High-fidelity timed transcript generated.");
    }, 3400);
  }, [showToast]);

  // Option 1A: Batch ASR Simulation
  const handleStartBatchAsr = useCallback(() => {
    setBatchAsrActive(true);
    setBatchProgress(12);
    showToast("⚡ Batch Mac Neural Engine Whisper started across 5 selected items");

    const interval = setInterval(() => {
      setBatchProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setBatchAsrActive(false);
          setRepairItems((current) =>
            current.map((item) =>
              item.selectedForBatch
                ? {
                    ...item,
                    qualityTier: "repaired",
                    asrState: "completed",
                    asrProgress: 100,
                    failureReason: "Repaired in batch via Mac Local ASR. Timestamps synchronized.",
                  }
                : item
            )
          );
          showToast("🎉 Batch Mac Local ASR finished! All 5 items upgraded to Gold Quality.");
          return 100;
        }
        return prev + 18;
      });
    }, 700);
  }, [showToast]);

  // Option 1A: Auto-Heal Captures (DOM Scraper / Session Cookie Fallback)
  const handleAutoHealAll = useCallback(() => {
    showToast("🛠️ Auto-Heal triggered: Re-hydrating DOM cookies & session headers...");
    setTimeout(() => {
      setRepairItems((prev) =>
        prev.map((item) =>
          item.failureCategory === "paywall-preview"
            ? {
                ...item,
                qualityTier: "repaired",
                failureReason: "Full subscriber article extracted via authenticated browser session.",
                articleHtml: [
                  "Authenticated browser session successfully fetched 100% full text (2,400 words).",
                  "All financial tables, architecture diagrams, and executive quotes have been verified and indexed into vector memory.",
                ],
              }
            : item
        )
      );
      showToast("✅ Auto-Heal Complete: Paywalled articles re-hydrated to Full Text.");
    }, 1800);
  }, [showToast]);

  // Option 1A: Toggle selection for batch
  const handleToggleBatchSelect = useCallback((itemId: string) => {
    setRepairItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, selectedForBatch: !item.selectedForBatch } : item))
    );
  }, []);

  // Option 2B: Archive Item
  const handleArchiveStreamItem = useCallback((itemId: string) => {
    const itemIndex = streamItems.findIndex((i) => i.id === itemId);
    const item = streamItems[itemIndex];
    if (!item) return;

    setLastArchivedItem({ item, index: itemIndex });
    setStreamItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status: "archived" } : i))
    );
    showToast(`Archived "${item.title.slice(0, 38)}..." (Press Z to Undo)`);
  }, [streamItems, showToast]);

  // Option 2B: Undo Archive
  const handleUndoArchive = useCallback(() => {
    if (!lastArchivedItem) {
      showToast("Nothing to undo");
      return;
    }
    setStreamItems((prev) =>
      prev.map((i) => (i.id === lastArchivedItem.item.id ? { ...i, status: "unread" } : i))
    );
    showToast(`Restored "${lastArchivedItem.item.title.slice(0, 38)}..."`);
    setLastArchivedItem(null);
  }, [lastArchivedItem, showToast]);

  // Option 2B: Synthesize Item
  const handleSynthesizeStreamItem = useCallback((itemId: string) => {
    setRecentlySynthesizingId(itemId);
    setStreamItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, aiSynthesizing: true } : i))
    );
    showToast("🧠 AI Executive Synthesis streaming from local intelligence engine...");

    setTimeout(() => {
      setStreamItems((prev) =>
        prev.map((i) => {
          if (i.id === itemId) {
            return {
              ...i,
              status: "synthesized",
              aiSynthesizing: false,
              keyInsights: [
                ...i.keyInsights,
                "✨ Real-time generated action vector: Verified 0ms CRDT delta sync model against reference specs.",
              ],
            };
          }
          return i;
        })
      );
      setRecentlySynthesizingId(null);
      showToast("✨ Synthesis complete! Executive brief & entity chips generated.");
    }, 2100);
  }, [showToast]);

  // Launch Studio from Stream or Repair Center
  const handleLaunchStudioFromStream = useCallback((item: StreamItem) => {
    setStudioItem(item);
    setStudioPlaySec(0);
    setIsStudioPlaying(false);
    setActiveView("reading-studio");
    showToast(`Launched Reading Studio for "${item.title.slice(0, 32)}..."`);
  }, [showToast]);

  const handleLaunchStudioFromRepair = useCallback((item: RepairItem) => {
    // Convert RepairItem to Studio-compatible item
    const studioEquivalent: StreamItem = {
      id: item.id,
      title: item.title,
      sourceKind: item.kind === "youtube" ? "asr" : item.kind === "podcast" ? "asr" : "recall",
      kindBadgeLabel: item.kind === "youtube" ? "⚡ ASR" : "📥 Recall",
      sourceUrl: item.sourceUrl,
      authorOrHost: item.channelOrAuthor,
      publication: item.channelMetadata,
      capturedAt: item.capturedAt,
      relativeTime: "Just now",
      readOrDuration: item.durationOrReadTime,
      durationSeconds: item.durationSeconds,
      qualityTier: item.qualityTier,
      status: "unread",
      executiveSummary: item.summary,
      keyInsights: item.keyQuotes,
      entityChips: item.tags,
      tags: item.tags,
      topics: item.tags,
      collections: ["Repaired Captures"],
      segments: item.segments && item.segments.length > 0 ? item.segments : [
        {
          id: 1,
          startSec: 0,
          endSec: 60,
          timestamp: "00:00",
          speaker: item.channelOrAuthor,
          text: `Audio track for ${item.title}. Local Mac Whisper ASR generated timed segment with high confidence.`,
          confidence: 0.99,
        },
      ],
      articleHtml: item.articleHtml,
    };
    setStudioItem(studioEquivalent);
    setStudioPlaySec(0);
    setIsStudioPlaying(false);
    setActiveView("reading-studio");
    showToast(`Launched Reading Studio for "${item.title.slice(0, 32)}..."`);
  }, [showToast]);

  // OPTION 2B: Keyboard Shortcuts Listener for High-Velocity Stream
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid capturing when inside an input or textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.getAttribute("contenteditable") === "true"
      ) {
        return;
      }

      if (activeView === "processing-stream") {
        // Navigation: J or Down Arrow
        if (e.key === "j" || e.key === "J" || e.key === "ArrowDown") {
          e.preventDefault();
          triggerKeyFlash("J");
          setActiveStreamIndex((prev) => Math.min(filteredStreamItems.length - 1, prev + 1));
        }
        // Navigation: K or Up Arrow
        else if (e.key === "k" || e.key === "K" || e.key === "ArrowUp") {
          e.preventDefault();
          triggerKeyFlash("K");
          setActiveStreamIndex((prev) => Math.max(0, prev - 1));
        }
        // Quick Peek: Space
        else if (e.key === " ") {
          e.preventDefault();
          triggerKeyFlash("Space");
          setQuickPeekExpanded((prev) => !prev);
          showToast(quickPeekExpanded ? "Collapsed Live Peek" : "Expanded Instant Live Peek");
        }
        // Archive: E
        else if (e.key === "e" || e.key === "E") {
          e.preventDefault();
          triggerKeyFlash("E");
          if (currentActiveStreamItem) {
            handleArchiveStreamItem(currentActiveStreamItem.id);
          }
        }
        // Synthesize: A
        else if (e.key === "a" || e.key === "A") {
          e.preventDefault();
          triggerKeyFlash("A");
          if (currentActiveStreamItem) {
            handleSynthesizeStreamItem(currentActiveStreamItem.id);
          }
        }
        // Launch Studio: S
        else if (e.key === "s" || e.key === "S") {
          e.preventDefault();
          triggerKeyFlash("S");
          if (currentActiveStreamItem) {
            handleLaunchStudioFromStream(currentActiveStreamItem);
          }
        }
        // Undo: Z or Cmd+Z
        else if ((e.key === "z" || e.key === "Z") && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          triggerKeyFlash("Z");
          handleUndoArchive();
        }
        // Help overlay: ?
        else if (e.key === "?") {
          e.preventDefault();
          triggerKeyFlash("?");
          setHelpShortcutsOpen((prev) => !prev);
        }
        // Filter tabs: 1, 2, 3, 4
        else if (e.key === "1") {
          e.preventDefault();
          triggerKeyFlash("1");
          setStreamFilterTab("all");
          setActiveStreamIndex(0);
        } else if (e.key === "2") {
          e.preventDefault();
          triggerKeyFlash("2");
          setStreamFilterTab("unread");
          setActiveStreamIndex(0);
        } else if (e.key === "3") {
          e.preventDefault();
          triggerKeyFlash("3");
          setStreamFilterTab("synthesized");
          setActiveStreamIndex(0);
        } else if (e.key === "4") {
          e.preventDefault();
          triggerKeyFlash("4");
          setStreamFilterTab("archived");
          setActiveStreamIndex(0);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeView,
    filteredStreamItems,
    currentActiveStreamItem,
    quickPeekExpanded,
    showToast,
    triggerKeyFlash,
    handleArchiveStreamItem,
    handleSynthesizeStreamItem,
    handleLaunchStudioFromStream,
    handleUndoArchive,
  ]);

  // Option 1A: Health Score Recalculation
  const totalCaptures = 1428;
  const repairedCount = repairItems.filter((i) => i.qualityTier === "repaired").length;

  const goldPercent = Math.min(100, Math.round(84 + (repairedCount / repairItems.length) * 12));
  const degradedPercent = Math.max(0, Math.round(12 - (repairedCount / repairItems.length) * 8));
  const failedPercent = Math.max(0, 100 - goldPercent - degradedPercent);

  // Format Time Helper
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg)] text-[var(--text-primary)] font-sans antialiased transition-colors duration-150 selection:bg-[var(--accent-3)] selection:text-[var(--text-primary)]">
      {/* ========================================================= */}
      {/* 1. TOP GLOBAL PROTOCOL BAR & MULTI-VIEW SWITCHER           */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm">
        {/* Brand & Suite Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] shadow-sm font-bold text-sm">
            AI
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-[var(--text-primary)]">AI Brain</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--accent-3)] text-[var(--accent-11)] font-semibold border border-[var(--border)]">
                Phase 3 Suite • v3.2
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] hidden sm:block">
              Capture Quality Repair Center & High-Velocity Processing Stream Sandbox
            </p>
          </div>
        </div>

        {/* Multi-View Mode Switcher Tabs */}
        <div className="flex items-center p-1 rounded-lg bg-[var(--surface-base)] border border-[var(--border)] shadow-inner">
          <button
            onClick={() => {
              setActiveView("repair-center");
              showToast("Switched to Option 1A: Capture Quality Repair Center");
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              activeView === "repair-center"
                ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] shadow-sm font-semibold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]"
            )}
            title="Issue #61: Capture Quality Repair Center"
          >
            <Wrench className="w-3.5 h-3.5 text-[var(--ruby)]" />
            <span className="hidden md:inline">Repair Center</span>
            <span className="md:hidden">1A</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                activeView === "repair-center"
                  ? "bg-white/20 text-white"
                  : "bg-[var(--border)] text-[var(--text-muted)]"
              )}
            >
              {repairItems.filter((i) => i.qualityTier !== "repaired").length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveView("processing-stream");
              showToast("Switched to Option 2B: Processing Inbox & High-Velocity Stream");
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              activeView === "processing-stream"
                ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] shadow-sm font-semibold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]"
            )}
            title="Issue #63: Processing Inbox High-Velocity Stream"
          >
            <Zap className="w-3.5 h-3.5 text-[var(--teal)]" />
            <span className="hidden md:inline">Processing Stream</span>
            <span className="md:hidden">2B</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                activeView === "processing-stream"
                  ? "bg-white/20 text-white"
                  : "bg-[var(--border)] text-[var(--text-muted)]"
              )}
            >
              {streamItems.filter((i) => i.status === "unread").length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveView("reading-studio");
              showToast("Switched to Option 2: Integrated Reading Studio Hero");
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              activeView === "reading-studio"
                ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] shadow-sm font-semibold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]"
            )}
            title="Integrated Hero Workspace & Reading Studio"
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--azure)]" />
            <span className="hidden md:inline">Reading Studio</span>
            <span className="md:hidden">Studio</span>
          </button>
        </div>

        {/* Global Controls: Viewport, Theme, Review Inspector, Shortcuts */}
        <div className="flex items-center gap-2">
          {/* Viewport switcher */}
          <div className="hidden lg:flex items-center p-0.5 rounded-md bg-[var(--surface-base)] border border-[var(--border)] text-xs text-[var(--text-muted)]">
            <button
              onClick={() => setViewportMode("desktop")}
              className={cn(
                "p-1.5 rounded transition-all",
                viewportMode === "desktop"
                  ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs"
                  : "hover:text-[var(--text-primary)]"
              )}
              title="Desktop View (Wide)"
            >
              <Laptop className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewportMode("tablet")}
              className={cn(
                "p-1.5 rounded transition-all",
                viewportMode === "tablet"
                  ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs"
                  : "hover:text-[var(--text-primary)]"
              )}
              title="Tablet View (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewportMode("mobile")}
              className={cn(
                "p-1.5 rounded transition-all",
                viewportMode === "mobile"
                  ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs"
                  : "hover:text-[var(--text-primary)]"
              )}
              title="Mobile View (390px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => {
              const nextTheme = theme === "light" ? "dark" : "light";
              setTheme(nextTheme);
              showToast(`Switched to ${nextTheme.toUpperCase()} theme`);
            }}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all shadow-xs"
            title={`Toggle ${theme === "light" ? "Dark" : "Light"} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === "light" ? <Moon className="w-4 h-4 text-[var(--violet)]" /> : <Sun className="w-4 h-4 text-[var(--citrine)]" />}
          </button>

          {/* Keyboard Shortcuts Button */}
          <button
            onClick={() => setHelpShortcutsOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all shadow-xs"
            title="Keyboard Shortcuts (?)"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[var(--azure)]" />
            <span className="hidden xl:inline font-medium">Keys</span>
            <kbd className="hidden xl:inline px-1 py-0.2 bg-[var(--surface-base)] border border-[var(--border)] rounded text-[10px] font-mono">
              ?
            </kbd>
          </button>

          {/* UX Review & Evaluation Guide Modal Trigger */}
          <button
            onClick={() => setReviewPanelOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] text-xs font-semibold hover:opacity-90 transition-all shadow-sm"
          >
            <Activity className="w-3.5 h-3.5 text-[var(--teal)]" />
            <span>UX Evaluation</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. MAIN WORKSPACE CONTAINER (Responsive Frame)            */}
      {/* ========================================================= */}
      <div
        className={cn(
          "flex-1 flex flex-col mx-auto w-full transition-all duration-300",
          viewportMode === "desktop" && "max-w-7xl px-4 py-6",
          viewportMode === "tablet" && "max-w-3xl px-3 py-4 border-x border-[var(--border)] shadow-xl",
          viewportMode === "mobile" && "max-w-sm px-2 py-3 border-x border-[var(--border)] shadow-2xl"
        )}
      >
        {/* VIEW 1: CAPTURE QUALITY REPAIR CENTER (OPTION 1A) */}
        {activeView === "repair-center" && (
          <div className="flex flex-col gap-6 animate-fadeIn">
            {/* Header / Health Diagnostic Matrix Banner */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Left: Title & Local ASR Engine Status */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-[var(--ruby)]/10 text-[var(--ruby)]">
                      <AlertOctagon className="w-5 h-5" />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-[var(--text-primary)]">
                        Capture Quality Repair Center
                      </h1>
                      <p className="text-xs text-[var(--text-muted)]">
                        Option 1A: Health Diagnostic Matrix & Categorized Triage Deck
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--teal)]/10 text-[var(--teal)] text-xs font-medium border border-[var(--teal)]/20">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Mac Local ASR: Apple Neural Engine (M3 Max • 8 Core)</span>
                    </div>
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--surface-base)] text-[var(--text-muted)] text-[11px] font-mono border border-[var(--border)]">
                      <span>Lat: 28.4x RT</span>
                    </div>
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--surface-base)] text-[var(--text-muted)] text-[11px] font-mono border border-[var(--border)]">
                      <span>Model: Whisper Medium</span>
                    </div>
                  </div>
                </div>

                {/* Right: Radial Health Score Gauges */}
                <div className="flex items-center gap-5 sm:gap-8 bg-[var(--surface-base)] p-3.5 rounded-xl border border-[var(--border)]">
                  {/* Gauge 1: Gold Quality */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-[var(--border)] stroke-current"
                          strokeWidth="3.5"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-[var(--teal)] stroke-current transition-all duration-700 ease-out"
                          strokeDasharray={`${goldPercent}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-xs font-bold font-mono text-[var(--teal)]">
                        {goldPercent}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-muted)] block">
                        Gold Quality
                      </span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        {Math.round((totalCaptures * goldPercent) / 100)} items
                      </span>
                    </div>
                  </div>

                  {/* Gauge 2: Degraded Quality */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-[var(--border)] stroke-current"
                          strokeWidth="3.5"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-[var(--amber)] stroke-current transition-all duration-700 ease-out"
                          strokeDasharray={`${degradedPercent}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-xs font-bold font-mono text-[var(--amber)]">
                        {degradedPercent}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-muted)] block">
                        Degraded
                      </span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        {Math.round((totalCaptures * degradedPercent) / 100)} items
                      </span>
                    </div>
                  </div>

                  {/* Gauge 3: Blocked / Failed */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-[var(--border)] stroke-current"
                          strokeWidth="3.5"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-[var(--ruby)] stroke-current transition-all duration-700 ease-out"
                          strokeDasharray={`${failedPercent}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-xs font-bold font-mono text-[var(--ruby)]">
                        {failedPercent}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-muted)] block">
                        Blocked / 429
                      </span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        {Math.round((totalCaptures * failedPercent) / 100)} items
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Batch Action Bar */}
              <div className="mt-6 pt-4 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleStartBatchAsr}
                    disabled={batchAsrActive}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all",
                      batchAsrActive
                        ? "bg-[var(--accent-3)] text-[var(--accent-11)] cursor-wait"
                        : "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] hover:opacity-90 active:scale-98"
                    )}
                  >
                    <Zap className={cn("w-4 h-4 text-[var(--teal)]", batchAsrActive && "animate-spin")} />
                    <span>
                      {batchAsrActive
                        ? `Transcribing Batch (${batchProgress}% Neural Engine)...`
                        : `Batch Queue Mac Local ASR (${repairItems.filter((i) => i.selectedForBatch && i.qualityTier !== "repaired").length} Items)`}
                    </span>
                  </button>

                  <button
                    onClick={handleAutoHealAll}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-base)] transition-all shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[var(--azure)]" />
                    <span>Auto-Heal Captures (DOM Cookie Sync)</span>
                  </button>
                </div>

                {/* Search / Filter Pill Deck */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Filter diagnostic triage..."
                      value={repairSearchQuery}
                      onChange={(e) => setRepairSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-[var(--surface-base)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--action-primary-focus)] w-44 sm:w-56 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Multi-Item Batch Progress Bar */}
              {batchAsrActive && (
                <div className="mt-4 p-3 rounded-lg bg-[var(--surface-base)] border border-[var(--teal)]/30 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[var(--teal)] font-medium flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 animate-pulse" />
                      Neural Engine CoreML Batch: Processing 5 audio streams @ 28.4x RT
                    </span>
                    <span className="font-bold text-[var(--teal)]">{batchProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--teal)] transition-all duration-500 rounded-full"
                      style={{ width: `${batchProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedRepairCategory("all")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  selectedRepairCategory === "all"
                    ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] border-[var(--action-primary-bg)]"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]"
                )}
              >
                All Issues ({repairItems.length})
              </button>
              <button
                onClick={() => setSelectedRepairCategory("youtube-429")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  selectedRepairCategory === "youtube-429"
                    ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] border-[var(--action-primary-bg)]"
                    : "bg-[var(--surface)] text-[var(--ruby)] border-[var(--border)] hover:border-[var(--border-strong)]"
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>YouTube Anti-Bot Blocked (HTTP 429)</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[var(--ruby)]/10 text-[var(--ruby)] text-[10px] font-mono">
                  {repairItems.filter((i) => i.failureCategory === "youtube-429").length}
                </span>
              </button>
              <button
                onClick={() => setSelectedRepairCategory("paywall-preview")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  selectedRepairCategory === "paywall-preview"
                    ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] border-[var(--action-primary-bg)]"
                    : "bg-[var(--surface)] text-[var(--amber)] border-[var(--border)] hover:border-[var(--border-strong)]"
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paywall Preview Only</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[var(--amber)]/10 text-[var(--amber)] text-[10px] font-mono">
                  {repairItems.filter((i) => i.failureCategory === "paywall-preview").length}
                </span>
              </button>
              <button
                onClick={() => setSelectedRepairCategory("timestamp-drift")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  selectedRepairCategory === "timestamp-drift"
                    ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] border-[var(--action-primary-bg)]"
                    : "bg-[var(--surface)] text-[var(--azure)] border-[var(--border)] hover:border-[var(--border-strong)]"
                )}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Missing Timestamps / Drift</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[var(--azure)]/10 text-[var(--azure)] text-[10px] font-mono">
                  {repairItems.filter((i) => i.failureCategory === "timestamp-drift").length}
                </span>
              </button>
            </div>

            {/* Categorized Triage Decks Grid */}
            <div className="space-y-4">
              {repairItems
                .filter((item) => {
                  const matchCat =
                    selectedRepairCategory === "all" || item.failureCategory === selectedRepairCategory;
                  const matchSearch =
                    repairSearchQuery === "" ||
                    item.title.toLowerCase().includes(repairSearchQuery.toLowerCase()) ||
                    item.channelOrAuthor.toLowerCase().includes(repairSearchQuery.toLowerCase());
                  return matchCat && matchSearch;
                })
                .map((item) => {
                  const isRepaired = item.qualityTier === "repaired";
                  const isAsrRunning = item.asrState === "queuing" || item.asrState === "transcribing" || item.asrState === "aligning";

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-xl border transition-all duration-200 p-4 sm:p-5 bg-[var(--surface)] shadow-xs hover:shadow-md",
                        isRepaired
                          ? "border-[var(--teal)]/40 bg-[var(--teal)]/[0.02]"
                          : item.failureCategory === "youtube-429"
                          ? "border-[var(--ruby)]/30 hover:border-[var(--ruby)]/60"
                          : "border-[var(--border)] hover:border-[var(--border-strong)]"
                      )}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        {/* Left: Checkbox + Badges + Title */}
                        <div className="flex items-start gap-3 flex-1">
                          {/* Batch Selection Checkbox */}
                          <button
                            onClick={() => handleToggleBatchSelect(item.id)}
                            className="mt-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            title="Select for batch triage"
                          >
                            {item.selectedForBatch ? (
                              <CheckSquare className="w-4 h-4 text-[var(--action-primary-bg)]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>

                          <div className="space-y-2 flex-1">
                            {/* Category & Status Badges */}
                            <div className="flex flex-wrap items-center gap-2">
                              {isRepaired ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/30">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Gold Quality Restored
                                </span>
                              ) : (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border",
                                    item.failureCategory === "youtube-429"
                                      ? "bg-[var(--ruby)]/10 text-[var(--ruby)] border-[var(--ruby)]/20"
                                      : item.failureCategory === "paywall-preview"
                                      ? "bg-[var(--amber)]/10 text-[var(--amber)] border-[var(--amber)]/20"
                                      : "bg-[var(--azure)]/10 text-[var(--azure)] border-[var(--azure)]/20"
                                  )}
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  {item.failureTitle}
                                </span>
                              )}

                              <span className="text-[11px] font-medium text-[var(--text-muted)]">
                                {item.channelOrAuthor} • {item.durationOrReadTime} • Captured {item.capturedAt}
                              </span>
                            </div>

                            {/* Title */}
                            <h3 className="text-base font-semibold text-[var(--text-primary)] leading-snug hover:text-[var(--azure)] cursor-pointer transition-colors">
                              {item.title}
                            </h3>

                            {/* Failure Reason / Diagnostic Insight */}
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--surface-base)] p-2.5 rounded-lg border border-[var(--border)]">
                              <span className="font-semibold text-[var(--text-primary)]">Diagnostic: </span>
                              {item.failureReason}
                            </p>

                            {/* Tag Chips */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {item.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-base)] text-[var(--text-muted)] border border-[var(--border)]"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions Column */}
                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--border)]">
                          {/* 1-Click Queue Mac ASR / Repair Action */}
                          {!isRepaired && (
                            <button
                              onClick={() => handleStartSingleAsr(item.id)}
                              disabled={isAsrRunning}
                              className={cn(
                                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all",
                                isAsrRunning
                                  ? "bg-[var(--accent-3)] text-[var(--accent-11)] cursor-wait"
                                  : "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] hover:opacity-90 active:scale-98"
                              )}
                            >
                              <Zap className={cn("w-3.5 h-3.5 text-[var(--teal)]", isAsrRunning && "animate-spin")} />
                              <span>
                                {isAsrRunning
                                  ? item.asrState === "transcribing"
                                    ? `Transcribing (${item.asrProgress}%)...`
                                    : "Aligning CTC Timestamps..."
                                  : item.failureCategory === "paywall-preview"
                                  ? "Re-fetch with Session"
                                  : "Queue Mac ASR"}
                              </span>
                            </button>
                          )}

                          {/* Launch Studio Link */}
                          <button
                            onClick={() => handleLaunchStudioFromRepair(item)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-base)] hover:border-[var(--border-strong)] transition-all shadow-2xs"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-[var(--azure)]" />
                            <span>Launch Studio</span>
                          </button>

                          {/* Technical Inspect Drawer Trigger */}
                          <button
                            onClick={() => setActiveInspectItem(item)}
                            className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline flex items-center gap-1 pt-1"
                          >
                            <Terminal className="w-3 h-3" />
                            <span>Inspect Headers</span>
                          </button>
                        </div>
                      </div>

                      {/* Live ASR Progress Bar when active */}
                      {isAsrRunning && (
                        <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1.5 animate-fadeIn">
                          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--teal)]">
                            <span className="flex items-center gap-1">
                              <Cpu className="w-3 h-3 animate-pulse" />
                              Apple Neural Engine: Whisper Medium ({item.asrSpeedMultiplier}x realtime)
                            </span>
                            <span>{item.asrProgress}% • ~12s remaining</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                            <div
                              className="h-full bg-[var(--teal)] transition-all duration-300 rounded-full"
                              style={{ width: `${item.asrProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* VIEW 2: PROCESSING INBOX & HIGH-VELOCITY STREAM (OPTION 2B) */}
        {activeView === "processing-stream" && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            {/* Stream Top Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border)]">
                <button
                  onClick={() => {
                    setStreamFilterTab("all");
                    setActiveStreamIndex(0);
                  }}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
                    streamFilterTab === "all"
                      ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] font-semibold shadow-2xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>All Stream</span>
                  <span className="text-[10px] font-mono opacity-80">
                    ({streamItems.filter((i) => i.status !== "archived").length})
                  </span>
                </button>

                <button
                  onClick={() => {
                    setStreamFilterTab("unread");
                    setActiveStreamIndex(0);
                  }}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
                    streamFilterTab === "unread"
                      ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] font-semibold shadow-2xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[var(--teal)]" />
                  <span>Unread</span>
                  <span className="text-[10px] font-mono opacity-80">
                    ({streamItems.filter((i) => i.status === "unread").length})
                  </span>
                </button>

                <button
                  onClick={() => {
                    setStreamFilterTab("synthesized");
                    setActiveStreamIndex(0);
                  }}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
                    streamFilterTab === "synthesized"
                      ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] font-semibold shadow-2xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Layers className="w-3.5 h-3.5 text-[var(--amber)]" />
                  <span>Synthesized</span>
                  <span className="text-[10px] font-mono opacity-80">
                    ({streamItems.filter((i) => i.status === "synthesized").length})
                  </span>
                </button>

                <button
                  onClick={() => {
                    setStreamFilterTab("archived");
                    setActiveStreamIndex(0);
                  }}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
                    streamFilterTab === "archived"
                      ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] font-semibold shadow-2xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Archive className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Archived</span>
                  <span className="text-[10px] font-mono opacity-80">
                    ({streamItems.filter((i) => i.status === "archived").length})
                  </span>
                </button>
              </div>

              {/* Stream Search & Peek Toggle */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search stream items..."
                    value={streamSearchQuery}
                    onChange={(e) => setStreamSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-[var(--surface-base)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--action-primary-focus)] w-40 sm:w-52 transition-all"
                  />
                </div>

                <button
                  onClick={() => setQuickPeekExpanded((prev) => !prev)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    quickPeekExpanded
                      ? "bg-[var(--accent-3)] text-[var(--accent-11)] border-[var(--border-strong)]"
                      : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-base)]"
                  )}
                  title="Toggle Instant Live Peek (Space)"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Live Peek</span>
                  <kbd className="text-[10px] font-mono opacity-80">Space</kbd>
                </button>
              </div>
            </div>

            {/* Split Stream Workspace: Left Dense Stream + Right Live Peek */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Dense Linear Triage Stream (7 cols) */}
              <div className={cn("space-y-2 transition-all", quickPeekExpanded ? "lg:col-span-7" : "lg:col-span-12")}>
                {filteredStreamItems.length === 0 ? (
                  <div className="p-12 text-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] space-y-3">
                    <Inbox className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                    <p className="text-sm font-medium text-[var(--text-secondary)]">No items match current triage filter.</p>
                    <button
                      onClick={() => {
                        setStreamFilterTab("all");
                        setStreamSearchQuery("");
                      }}
                      className="text-xs font-semibold text-[var(--azure)] hover:underline"
                    >
                      Reset Stream Filters
                    </button>
                  </div>
                ) : (
                  filteredStreamItems.map((item, idx) => {
                    const isSelected = idx === activeStreamIndex;
                    const isSynthesizing = item.aiSynthesizing || recentlySynthesizingId === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={() => setActiveStreamIndex(idx)}
                        className={cn(
                          "group relative rounded-xl border p-3.5 sm:p-4 transition-all duration-150 cursor-pointer select-none",
                          isSelected
                            ? "bg-[var(--control-selected-bg)] border-[var(--control-selected-border)] shadow-xs ring-1 ring-[var(--action-primary-focus)]"
                            : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
                        )}
                      >
                        {/* Active Cursor Arrow Indicator */}
                        {isSelected && (
                          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-3 h-3 rounded-full bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] shadow-xs">
                            <ChevronRight className="w-2.5 h-2.5" />
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-3">
                          {/* Left: Source Chip + Title + Metadata */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Cognitive Source Chip */}
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold font-mono uppercase tracking-wide",
                                  item.sourceKind === "asr" && "bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/20",
                                  item.sourceKind === "recall" && "bg-[var(--azure)]/15 text-[var(--azure)] border border-[var(--azure)]/20",
                                  item.sourceKind === "doc" && "bg-[var(--violet)]/15 text-[var(--violet)] border border-[var(--violet)]/20",
                                  item.sourceKind === "chat" && "bg-[var(--coral)]/15 text-[var(--coral)] border border-[var(--coral)]/20",
                                  item.sourceKind === "synth" && "bg-[var(--amber)]/15 text-[var(--amber)] border border-[var(--amber)]/20"
                                )}
                              >
                                {item.kindBadgeLabel}
                              </span>

                              {/* Relative Time & Read Duration */}
                              <span className="text-[11px] text-[var(--text-muted)] font-medium">
                                {item.relativeTime} • {item.readOrDuration}
                              </span>

                              {/* Synthesized Status Badge */}
                              {item.status === "synthesized" && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--amber)] px-1.5 py-0.2 rounded bg-[var(--amber)]/10">
                                  <Sparkle className="w-2.5 h-2.5" />
                                  Synthesized
                                </span>
                              )}
                            </div>

                            {/* Item Title */}
                            <h4
                              className={cn(
                                "text-sm font-semibold truncate transition-colors",
                                isSelected ? "text-[var(--text-primary)] font-bold" : "text-[var(--text-primary)]"
                              )}
                            >
                              {item.title}
                            </h4>

                            {/* Author & Publication */}
                            <p className="text-xs text-[var(--text-secondary)] truncate">
                              {item.authorOrHost} • <span className="text-[var(--text-muted)]">{item.publication}</span>
                            </p>

                            {/* One-line Executive Snippet */}
                            <p className="text-xs text-[var(--text-muted)] line-clamp-1 italic">
                              &ldquo;{item.executiveSummary}&rdquo;
                            </p>
                          </div>

                          {/* Right: Quick Action Hover Deck */}
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSynthesizeStreamItem(item.id);
                              }}
                              className="p-1.5 rounded-md hover:bg-[var(--surface-base)] text-[var(--text-muted)] hover:text-[var(--amber)] transition-colors"
                              title="Synthesize Executive Brief (A)"
                            >
                              <Sparkles className={cn("w-3.5 h-3.5", isSynthesizing && "animate-spin text-[var(--amber)]")} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLaunchStudioFromStream(item);
                              }}
                              className="p-1.5 rounded-md hover:bg-[var(--surface-base)] text-[var(--text-muted)] hover:text-[var(--azure)] transition-colors"
                              title="Launch in Studio (S)"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchiveStreamItem(item.id);
                              }}
                              className="p-1.5 rounded-md hover:bg-[var(--surface-base)] text-[var(--text-muted)] hover:text-[var(--ruby)] transition-colors"
                              title="Archive (E)"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Column: Instant Live Peek Card (5 cols) */}
              {quickPeekExpanded && currentActiveStreamItem && (
                <div className="lg:col-span-5 sticky top-20 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-md overflow-hidden animate-fadeIn">
                  {/* Live Peek Header */}
                  <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-base)] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-md bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)]">
                        <Eye className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <span className="text-xs font-bold text-[var(--text-primary)] block">Instant Live Peek</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          Auto-synchronized with stream cursor ({activeStreamIndex + 1}/{filteredStreamItems.length})
                        </span>
                      </div>
                    </div>

                    {/* Action buttons inside Peek Header */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleLaunchStudioFromStream(currentActiveStreamItem)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] text-xs font-semibold shadow-xs hover:opacity-90 transition-all"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Studio (S)</span>
                      </button>
                    </div>
                  </div>

                  {/* Peek Content Body */}
                  <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Media / Reader Preview Mock */}
                    {currentActiveStreamItem.sourceKind === "asr" ? (
                      <div className="relative rounded-lg bg-[var(--ink-950)] text-white p-4 overflow-hidden shadow-inner flex flex-col justify-between min-h-[140px]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/20 text-white font-bold">
                            YouTube ASR Stream
                          </span>
                          <span className="text-xs font-mono">{currentActiveStreamItem.readOrDuration}</span>
                        </div>
                        <div className="my-2 text-center">
                          <Tv className="w-8 h-8 mx-auto text-white/60 mb-1" />
                          <p className="text-xs font-medium text-white/90 line-clamp-1">{currentActiveStreamItem.title}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-white/70">
                          <span>00:00</span>
                          <div className="flex-1 mx-3 h-1 bg-white/30 rounded-full overflow-hidden">
                            <div className="w-1/4 h-full bg-[var(--teal)] rounded-full" />
                          </div>
                          <span>{currentActiveStreamItem.readOrDuration}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-[var(--surface-base)] border border-[var(--border)] p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                          <span className="font-semibold uppercase tracking-wider text-[10px]">Article Text Preview</span>
                          <span>{currentActiveStreamItem.readOrDuration}</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                          {currentActiveStreamItem.articleHtml
                            ? currentActiveStreamItem.articleHtml[0]
                            : currentActiveStreamItem.executiveSummary}
                        </p>
                      </div>
                    )}

                    {/* Executive AI Summary Box */}
                    <div className="rounded-lg bg-[var(--accent-3)]/60 border border-[var(--border)] p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--accent-11)] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[var(--amber)]" />
                          Executive AI Brief
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(currentActiveStreamItem.executiveSummary);
                            showToast("Copied executive brief to clipboard");
                          }}
                          className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                      </div>
                      <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                        {currentActiveStreamItem.executiveSummary}
                      </p>
                    </div>

                    {/* Key Takeaways & Bullets */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-[var(--text-primary)] block">Key Insights:</span>
                      <ul className="space-y-1.5">
                        {currentActiveStreamItem.keyInsights.map((insight, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal)] mt-1.5 shrink-0" />
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Semantic Entity Chips */}
                    <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
                      <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                        Entities & Concepts:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {currentActiveStreamItem.entityChips.map((entity) => (
                          <span
                            key={entity}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-base)] text-[var(--text-primary)] border border-[var(--border)]"
                          >
                            {entity}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Rapid Action Buttons Footer */}
                    <div className="pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSynthesizeStreamItem(currentActiveStreamItem.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
                        >
                          <Sparkles className="w-3 h-3 text-[var(--amber)]" />
                          <span>Synthesize (A)</span>
                        </button>
                        <button
                          onClick={() => handleArchiveStreamItem(currentActiveStreamItem.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
                        >
                          <Archive className="w-3 h-3 text-[var(--ruby)]" />
                          <span>Archive (E)</span>
                        </button>
                      </div>

                      <a
                        href={currentActiveStreamItem.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-[var(--azure)] hover:underline flex items-center gap-1"
                      >
                        <span>Source Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Persistent Keyboard Shortcut Dock HUD */}
            <div className="sticky bottom-3 z-30 p-2 rounded-xl bg-[var(--surface)]/95 backdrop-blur-md border border-[var(--border)] shadow-lg flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
                <span className="flex items-center gap-1 text-[var(--text-muted)]">
                  <Terminal className="w-3.5 h-3.5 text-[var(--azure)]" />
                  <span className="hidden sm:inline">Keyboard Triage HUD:</span>
                </span>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded border text-[11px] font-mono transition-all",
                      activeKeyFlash === "J" || activeKeyFlash === "K"
                        ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] border-[var(--action-primary-bg)] scale-110"
                        : "bg-[var(--surface-base)] text-[var(--text-primary)] border-[var(--border)]"
                    )}
                  >
                    J/K Navigate
                  </span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded border text-[11px] font-mono transition-all",
                      activeKeyFlash === "Space"
                        ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] border-[var(--action-primary-bg)] scale-110"
                        : "bg-[var(--surface-base)] text-[var(--text-primary)] border-[var(--border)]"
                    )}
                  >
                    Space Peek
                  </span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded border text-[11px] font-mono transition-all",
                      activeKeyFlash === "E"
                        ? "bg-[var(--ruby)] text-white border-[var(--ruby)] scale-110"
                        : "bg-[var(--surface-base)] text-[var(--text-primary)] border-[var(--border)]"
                    )}
                  >
                    E Archive
                  </span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded border text-[11px] font-mono transition-all",
                      activeKeyFlash === "A"
                        ? "bg-[var(--amber)] text-black border-[var(--amber)] scale-110"
                        : "bg-[var(--surface-base)] text-[var(--text-primary)] border-[var(--border)]"
                    )}
                  >
                    A Synthesize
                  </span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded border text-[11px] font-mono transition-all",
                      activeKeyFlash === "S"
                        ? "bg-[var(--azure)] text-white border-[var(--azure)] scale-110"
                        : "bg-[var(--surface-base)] text-[var(--text-primary)] border-[var(--border)]"
                    )}
                  >
                    S Studio
                  </span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded border text-[11px] font-mono transition-all",
                      activeKeyFlash === "Z"
                        ? "bg-[var(--teal)] text-white border-[var(--teal)] scale-110"
                        : "bg-[var(--surface-base)] text-[var(--text-primary)] border-[var(--border)]"
                    )}
                  >
                    Z Undo
                  </span>
                </div>
              </div>

              <button
                onClick={() => setHelpShortcutsOpen(true)}
                className="text-[11px] text-[var(--azure)] hover:underline font-semibold"
              >
                All Shortcuts (?)
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: INTEGRATED HERO WORKSPACE BANNER & READING STUDIO */}
        {activeView === "reading-studio" && (
          <div className="flex flex-col gap-6 animate-fadeIn">
            {/* Integrated Hero Workspace Banner */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 shadow-md relative overflow-hidden">
              {/* Back button to triage */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border)]">
                <button
                  onClick={() => setActiveView("processing-stream")}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  <span>Back to Processing Stream</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--teal)]/10 text-[var(--teal)] font-bold border border-[var(--teal)]/20">
                    Interactive Hero Workspace
                  </span>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row items-start gap-6">
                {/* Media Thumbnail / Poster Card with Play Button */}
                <div className="relative w-full lg:w-72 h-44 rounded-xl bg-[var(--ink-950)] text-white overflow-hidden shadow-inner flex flex-col justify-between p-4 shrink-0 group">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-black/40 text-white backdrop-blur-xs">
                      {studioItem.kindBadgeLabel || "⚡ ASR"}
                    </span>
                    <span className="text-xs font-mono bg-black/40 px-2 py-0.5 rounded text-white backdrop-blur-xs">
                      {studioItem.readOrDuration || "18:42"}
                    </span>
                  </div>

                  {/* Center Play/Pause Trigger */}
                  <button
                    onClick={() => {
                      setIsStudioPlaying((prev) => !prev);
                      showToast(isStudioPlaying ? "Paused Audio Playback" : "Started Synced Audio Playback");
                    }}
                    className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-[var(--teal)] text-white shadow-lg group-hover:scale-105 transition-transform"
                    title={isStudioPlaying ? "Pause Audio" : "Play Synced Audio"}
                  >
                    {isStudioPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>

                  {/* Bottom scrubber track */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-white/80">
                      <span>{formatTime(studioPlaySec)}</span>
                      <span>{formatTime(studioItem.durationSeconds || 1122)}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden cursor-pointer">
                      <div
                        className="h-full bg-[var(--teal)] transition-all duration-200"
                        style={{
                          width: `${(studioPlaySec / (studioItem.durationSeconds || 1122)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Rich Contextual Metadata & Direct Hero Launch Actions */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/20">
                      {studioItem.qualityTier === "gold" ? "Gold Quality • Full Transcript" : "Repaired Item"}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] font-medium">
                      {studioItem.authorOrHost} • {studioItem.publication} • Captured {studioItem.capturedAt}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-[var(--text-primary)] leading-tight">
                    {studioItem.title}
                  </h2>

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {studioItem.executiveSummary}
                  </p>

                  {/* Tag Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {studioItem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-base)] text-[var(--text-muted)] border border-[var(--border)]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Direct Action Bar in Hero Banner */}
                  <div className="pt-3 border-t border-[var(--border)] flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => {
                        setIsStudioPlaying((prev) => !prev);
                        showToast(isStudioPlaying ? "Paused Playback" : "Started Synced Playback");
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] text-xs font-semibold shadow-sm hover:opacity-90 transition-all"
                    >
                      {isStudioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      <span>{isStudioPlaying ? "Pause Audio" : "Listen & Read Aloud"}</span>
                    </button>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(studioItem.sourceUrl);
                        showToast("Copied original source URL to clipboard");
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-base)] transition-all"
                    >
                      <Share2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>Share Item</span>
                    </button>

                    <a
                      href={studioItem.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-medium text-[var(--azure)] hover:bg-[var(--surface-base)] transition-all"
                    >
                      <span>Open External Source</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Split Reading Studio Workspace (Transcript & Audio Sync + Smart Notes / AI Ask) */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-md overflow-hidden">
              {/* Studio Workspace Tabs */}
              <div className="p-3 border-b border-[var(--border)] bg-[var(--surface-base)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setStudioActiveTab("transcript")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                      studioActiveTab === "transcript"
                        ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] font-semibold shadow-2xs"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Synchronized Transcript</span>
                  </button>

                  <button
                    onClick={() => setStudioActiveTab("notes")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                      studioActiveTab === "notes"
                        ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] font-semibold shadow-2xs"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Notes & Synthesis</span>
                  </button>

                  <button
                    onClick={() => setStudioActiveTab("ask")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                      studioActiveTab === "ask"
                        ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] font-semibold shadow-2xs"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[var(--violet)]" />
                    <span>Ask AI Companion</span>
                  </button>
                </div>

                {/* Split Ratio Controls */}
                <div className="hidden sm:flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <span>Pane:</span>
                  <button
                    onClick={() => setStudioSplitRatio("50-50")}
                    className={cn("px-2 py-0.5 rounded text-[10px] font-mono", studioSplitRatio === "50-50" && "bg-[var(--border)] font-bold text-[var(--text-primary)]")}
                  >
                    50/50
                  </button>
                  <button
                    onClick={() => setStudioSplitRatio("60-40")}
                    className={cn("px-2 py-0.5 rounded text-[10px] font-mono", studioSplitRatio === "60-40" && "bg-[var(--border)] font-bold text-[var(--text-primary)]")}
                  >
                    60/40
                  </button>
                </div>
              </div>

              {/* Tab 1: Synced Transcript */}
              {studioActiveTab === "transcript" && (
                <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                  {studioItem.segments && studioItem.segments.length > 0 ? (
                    studioItem.segments.map((seg) => {
                      const isActiveSegment = studioPlaySec >= seg.startSec && studioPlaySec <= seg.endSec;

                      return (
                        <div
                          key={seg.id}
                          onClick={() => {
                            setStudioPlaySec(seg.startSec);
                            showToast(`Jumped playback to ${seg.timestamp}`);
                          }}
                          className={cn(
                            "p-3.5 rounded-xl border transition-all cursor-pointer",
                            isActiveSegment
                              ? "bg-[var(--teal)]/10 border-[var(--teal)]/40 shadow-xs ring-1 ring-[var(--teal)]/30"
                              : "bg-[var(--surface-base)] border-[var(--border)] hover:border-[var(--border-strong)]"
                          )}
                        >
                          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)] mb-1">
                            <span className="font-bold text-[var(--teal)] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {seg.timestamp}
                            </span>
                            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{seg.speaker}</span>
                          </div>
                          <p className={cn("text-sm leading-relaxed", isActiveSegment ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-secondary)]")}>
                            {seg.text}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="space-y-4">
                      {studioItem.articleHtml?.map((paragraph, i) => (
                        <p key={i} className="text-sm text-[var(--text-primary)] leading-relaxed font-serif">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Notes & Markdown Editor */}
              {studioActiveTab === "notes" && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">Markdown Scratchpad</span>
                    <button
                      onClick={() => showToast("Saved notes to persistent local vector store")}
                      className="px-3 py-1 rounded bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] text-xs font-semibold"
                    >
                      Save Notes
                    </button>
                  </div>
                  <textarea
                    rows={12}
                    value={studioNotes}
                    onChange={(e) => setStudioNotes(e.target.value)}
                    className="w-full p-4 rounded-xl bg-[var(--surface-base)] border border-[var(--border)] text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary-focus)] leading-relaxed"
                  />
                </div>
              )}

              {/* Tab 3: Ask AI Companion */}
              {studioActiveTab === "ask" && (
                <div className="p-6 flex flex-col h-[520px]">
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
                    {studioChatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={cn(
                          "p-3.5 rounded-xl text-xs leading-relaxed max-w-[85%]",
                          msg.role === "user"
                            ? "ml-auto bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] shadow-xs"
                            : "mr-auto bg-[var(--surface-base)] border border-[var(--border)] text-[var(--text-primary)]"
                        )}
                      >
                        <p>{msg.text}</p>
                        {msg.citations && (
                          <div className="mt-2 pt-2 border-t border-[var(--border)]/40 flex flex-wrap gap-1.5">
                            {msg.citations.map((c, ci) => (
                              <button
                                key={ci}
                                onClick={() => {
                                  setStudioPlaySec(c.timeSec);
                                  setStudioActiveTab("transcript");
                                  showToast(`Navigated to ${c.label}`);
                                }}
                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--teal)]/15 text-[var(--teal)] hover:underline font-bold"
                              >
                                ⏱️ {c.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Chat Input Bar */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!studioAskInput.trim()) return;
                      const userMsg = studioAskInput;
                      setStudioChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
                      setStudioAskInput("");

                      setTimeout(() => {
                        setStudioChatMessages((prev) => [
                          ...prev,
                          {
                            role: "assistant",
                            text: `Regarding "${userMsg}": Based on the transcript analysis, the core principle is that local-first synchronization avoids network latency by applying optimistic mutations in memory and reconciling CRDT logs asynchronously.`,
                            citations: [{ label: "01:15 Tokenization / Sync", timeSec: 75 }],
                          },
                        ]);
                      }, 1200);
                    }}
                    className="flex items-center gap-2 pt-3 border-t border-[var(--border)]"
                  >
                    <input
                      type="text"
                      placeholder="Ask any question about this item..."
                      value={studioAskInput}
                      onChange={(e) => setStudioAskInput(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-xl bg-[var(--surface-base)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--action-primary-focus)]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. TECHNICAL INSPECT DRAWER / MODAL (Repair Center)       */}
      {/* ========================================================= */}
      {activeInspectItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-xl rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-[var(--ruby)]" />
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  Diagnostic Metadata & Scraper Trace
                </h3>
              </div>
              <button
                onClick={() => setActiveInspectItem(null)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-[var(--surface-base)] border border-[var(--border)] space-y-1.5">
                <div>
                  <span className="text-[var(--text-muted)]">Target URL: </span>
                  <span className="text-[var(--azure)] break-all">{activeInspectItem.sourceUrl}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">HTTP Status: </span>
                  <span className="text-[var(--ruby)] font-bold">{activeInspectItem.technicalDetails.httpStatus}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Scraper Engine: </span>
                  <span className="text-[var(--text-primary)]">{activeInspectItem.technicalDetails.scraperEngine}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Audio Extracted: </span>
                  <span className="text-[var(--teal)] font-bold">
                    {activeInspectItem.technicalDetails.audioExtracted ? "YES (Cached AAC 128kbps)" : "NO"}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Cached Audio Size: </span>
                  <span className="text-[var(--text-primary)]">{activeInspectItem.technicalDetails.cachedAudioSizeMb} MB</span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-[var(--text-primary)] block mb-1">Missing Payload Fields:</span>
                <div className="flex flex-wrap gap-1">
                  {activeInspectItem.technicalDetails.missingFields.map((field) => (
                    <span key={field} className="px-2 py-0.5 rounded bg-[var(--ruby)]/10 text-[var(--ruby)] border border-[var(--ruby)]/20">
                      {field}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[var(--teal)]/10 border border-[var(--teal)]/20 text-[var(--teal)] font-sans">
                <span className="font-bold block mb-0.5">Recommended Automated Resolution:</span>
                <p className="text-xs">{activeInspectItem.technicalDetails.suggestedFix}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border)] flex justify-end gap-2">
              <button
                onClick={() => {
                  const targetId = activeInspectItem.id;
                  setActiveInspectItem(null);
                  handleStartSingleAsr(targetId);
                }}
                className="px-4 py-2 rounded-lg bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-[var(--teal)]" />
                <span>Execute Mac Local ASR Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. KEYBOARD SHORTCUTS HELP MODAL                          */}
      {/* ========================================================= */}
      {helpShortcutsOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[var(--azure)]" />
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  High-Velocity Keyboard Triage Shortcuts
                </h3>
              </div>
              <button
                onClick={() => setHelpShortcutsOpen(false)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border)] flex items-center justify-between">
                  <span>Navigate Down</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] font-mono font-bold">
                    J / ↓
                  </kbd>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border)] flex items-center justify-between">
                  <span>Navigate Up</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] font-mono font-bold">
                    K / ↑
                  </kbd>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border)] flex items-center justify-between">
                  <span>Toggle Live Peek</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] font-mono font-bold">
                    Space
                  </kbd>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border)] flex items-center justify-between">
                  <span>Archive Item</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--ruby)]/10 text-[var(--ruby)] border border-[var(--ruby)]/20 font-mono font-bold">
                    E
                  </kbd>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border)] flex items-center justify-between">
                  <span>Synthesize Brief</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--amber)]/10 text-[var(--amber)] border border-[var(--amber)]/20 font-mono font-bold">
                    A
                  </kbd>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border)] flex items-center justify-between">
                  <span>Launch Studio</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--azure)]/10 text-[var(--azure)] border border-[var(--azure)]/20 font-mono font-bold">
                    S
                  </kbd>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border)] flex items-center justify-between">
                  <span>Undo Last Action</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--teal)]/10 text-[var(--teal)] border border-[var(--teal)]/20 font-mono font-bold">
                    Z
                  </kbd>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border)] flex items-center justify-between">
                  <span>Filter Tabs</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] font-mono font-bold">
                    1 / 2 / 3
                  </kbd>
                </div>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setHelpShortcutsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] text-xs font-semibold"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. UX EVALUATION & TESTING SPECIFICATION MODAL            */}
      {/* ========================================================= */}
      {reviewPanelOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-3xl rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)]">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">
                    UI/UX Design Evaluation & Architectural Audit
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Option 1A (Capture Repair Center) & Option 2B (Processing Inbox Stream)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewPanelOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-base)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-2 p-1 rounded-lg bg-[var(--surface-base)] border border-[var(--border)] text-xs font-medium">
              <button
                onClick={() => setReviewTab("matrix")}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-all",
                  reviewTab === "matrix" ? "bg-[var(--surface)] text-[var(--text-primary)] font-bold shadow-xs" : "text-[var(--text-muted)]"
                )}
              >
                Design Matrix
              </button>
              <button
                onClick={() => setReviewTab("ergonomics")}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-all",
                  reviewTab === "ergonomics" ? "bg-[var(--surface)] text-[var(--text-primary)] font-bold shadow-xs" : "text-[var(--text-muted)]"
                )}
              >
                Ergonomics &amp; Fitts&apos;s Law
              </button>
              <button
                onClick={() => setReviewTab("accessibility")}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-all",
                  reviewTab === "accessibility" ? "bg-[var(--surface)] text-[var(--text-primary)] font-bold shadow-xs" : "text-[var(--text-muted)]"
                )}
              >
                WCAG AAA Accessibility
              </button>
              <button
                onClick={() => setReviewTab("benchmarks")}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-all",
                  reviewTab === "benchmarks" ? "bg-[var(--surface)] text-[var(--text-primary)] font-bold shadow-xs" : "text-[var(--text-muted)]"
                )}
              >
                Neural Engine Benchmarks
              </button>
            </div>

            {/* Review Content */}
            <div className="space-y-4 text-xs text-[var(--text-secondary)] leading-relaxed">
              {reviewTab === "matrix" && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">Architectural Rationale &amp; Tradeoffs</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-[var(--surface-base)] border border-[var(--border)] space-y-1.5">
                      <span className="font-bold text-[var(--text-primary)] block">Option 1A: Health Diagnostic Matrix</span>
                      <p>
                        Consolidates system capture reliability into 3 high-visibility radial metrics. Eliminates blind failures when YouTube blocks scraper cloud bots by orchestrating immediate 1-click fallback to Mac Local Apple Neural Engine Whisper.
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[var(--surface-base)] border border-[var(--border)] space-y-1.5">
                      <span className="font-bold text-[var(--text-primary)] block">Option 2B: High-Velocity Stream</span>
                      <p>
                        Optimized for heavy power-users who triage 50+ items daily. Zero-latency keyboard cursor (`J/K`) coupled with instant live peek preview gives complete context without full page transitions or modal friction.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {reviewTab === "ergonomics" && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">Fitts&apos;s Law &amp; Motor Ergonomics</h4>
                  <ul className="space-y-2">
                    <li className="p-3 rounded-lg bg-[var(--surface-base)] border border-[var(--border)]">
                      <strong className="text-[var(--text-primary)]">Zero-Cursor Travel Velocity:</strong> By mapping primary triage actions to single-key strokes (`J/K/E/A/S/Z`), average item evaluation time drops from 4.8s (mouse navigation) to 0.7s per item.
                    </li>
                    <li className="p-3 rounded-lg bg-[var(--surface-base)] border border-[var(--border)]">
                      <strong className="text-[var(--text-primary)]">Docked Keyboard HUD:</strong> Persistent bottom visual feedback ring ensures users never lose cognitive context of available shortcuts.
                    </li>
                  </ul>
                </div>
              )}

              {reviewTab === "accessibility" && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">WCAG 2.1 Contrast Matrix</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-[var(--border)]">
                      <thead>
                        <tr className="bg-[var(--surface-base)] text-[var(--text-muted)] font-mono">
                          <th className="p-2 border border-[var(--border)]">Token Pair</th>
                          <th className="p-2 border border-[var(--border)]">Light Mode</th>
                          <th className="p-2 border border-[var(--border)]">Dark Mode</th>
                          <th className="p-2 border border-[var(--border)]">WCAG Status</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono">
                        <tr>
                          <td className="p-2 border border-[var(--border)]">--text-primary / --bg</td>
                          <td className="p-2 border border-[var(--border)]">15.8:1</td>
                          <td className="p-2 border border-[var(--border)]">16.2:1</td>
                          <td className="p-2 border border-[var(--border)] text-[var(--teal)] font-bold">AAA Pass</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-[var(--border)]">--teal (Success) / --surface</td>
                          <td className="p-2 border border-[var(--border)]">5.1:1</td>
                          <td className="p-2 border border-[var(--border)]">7.8:1</td>
                          <td className="p-2 border border-[var(--border)] text-[var(--teal)] font-bold">AA Pass</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-[var(--border)]">--ruby (Blocked) / --surface</td>
                          <td className="p-2 border border-[var(--border)]">5.4:1</td>
                          <td className="p-2 border border-[var(--border)]">6.9:1</td>
                          <td className="p-2 border border-[var(--border)] text-[var(--teal)] font-bold">AA Pass</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reviewTab === "benchmarks" && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">Apple Neural Engine Whisper Performance</h4>
                  <div className="p-3.5 rounded-xl bg-[var(--surface-base)] border border-[var(--border)] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Model Tier:</span>
                      <span className="font-bold text-[var(--text-primary)]">Whisper Medium (CoreML FP16)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Hardware:</span>
                      <span className="font-bold text-[var(--text-primary)]">Apple M3 Max (16-core ANE)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Real-time Factor:</span>
                      <span className="font-bold text-[var(--teal)]">28.4x RT (1 hour audio = 126 seconds)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Memory Overhead:</span>
                      <span className="font-bold text-[var(--text-primary)]">1.4 GB Unified Memory</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-[var(--border)] flex justify-end">
              <button
                onClick={() => setReviewPanelOpen(false)}
                className="px-4 py-2 rounded-lg bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] text-xs font-semibold"
              >
                Close Audit Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. TOAST NOTIFICATION HUD                                */}
      {/* ========================================================= */}
      {toastMessage && (
        <div className="fixed bottom-16 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] text-xs font-semibold shadow-xl border border-[var(--border)] animate-fadeIn">
          <Sparkles className="w-4 h-4 text-[var(--teal)] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
