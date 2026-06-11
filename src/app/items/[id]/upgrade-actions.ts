"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getItem } from "@/db/items";
import { upgradeItemCaptureContent } from "@/db/item-upgrades";
import { captureLinkedInUserText } from "@/lib/capture/linkedin";
import { detectCapturePlatform } from "@/lib/capture/platform";
import { canUpgradeWithPastedText, classifyCaptureUpgrade, isNeedsUpgrade } from "@/lib/capture/upgrade-policy";
import { analyzeUserProvidedText } from "@/lib/capture/user-provided";
import { buildYoutubeUserTextCapture } from "@/lib/capture/youtube-user-text";
import { logError } from "@/lib/errors/sink";

export type UpgradeTextState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; error: string }
  | null;

const UpgradeInput = z.object({
  item_id: z.string().min(1),
  text: z.string().max(100_000, "Pasted text is too long."),
});

export async function upgradeItemTextAction(
  _prev: UpgradeTextState,
  formData: FormData,
): Promise<UpgradeTextState> {
  const parsed = UpgradeInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const item = getItem(parsed.data.item_id);
  if (!item) return { status: "error", error: "This item was not found." };
  if (!item.source_url) {
    return { status: "error", error: "This item cannot be upgraded with pasted text." };
  }
  if (!canUpgradeWithPastedText(item)) {
    return {
      status: "error",
      error: isNeedsUpgrade(item)
        ? "This item cannot be upgraded with pasted text yet."
        : "This item already has saved content.",
    };
  }

  const detection = detectCapturePlatform(item.source_url);
  const textAnalysis = analyzeUserProvidedText(
    parsed.data.text,
    item.source_url,
    detection.canonicalUrl,
  );
  if (!textAnalysis.isMeaningful) {
    return {
      status: "error",
      error: textAnalysis.tooLong
        ? "Pasted text is too long."
        : "Paste at least 8 words.",
    };
  }

  const decision = classifyCaptureUpgrade(item, {
    platform: detection.platform,
    quality: "user_provided_full_text",
    hasMeaningfulText: true,
    hasUserText: true,
  });
  if (decision.action !== "upgrade") {
    return { status: "error", error: "This item already has saved content." };
  }

  const content = await buildUpgradeContent({
    item,
    platform: detection.platform,
    videoId: detection.videoId,
    canonicalUrl: detection.canonicalUrl,
    text: textAnalysis.text,
  });
  if (!content) {
    return { status: "error", error: "This item cannot be upgraded with pasted text." };
  }

  logError({
    type: "capture.upgrade.started",
    item_id: item.id,
    platform: detection.platform,
    source_url: detection.canonicalUrl,
    old_quality: item.capture_quality ?? null,
    action: "upgrade",
    reason: decision.reason,
    text_chars: textAnalysis.charCount,
    text_words: textAnalysis.wordCount,
    ts: Date.now(),
  });

  await upgradeItemCaptureContent({
    itemId: item.id,
    content,
    platform: detection.platform,
  });

  revalidatePath("/");
  revalidatePath(`/items/${item.id}`);
  return {
    status: "success",
    message: "Item updated. Enrichment and search are being refreshed.",
  };
}

async function buildUpgradeContent(input: {
  item: NonNullable<ReturnType<typeof getItem>>;
  platform: string;
  videoId?: string;
  canonicalUrl: string;
  text: string;
}) {
  if ((input.platform === "youtube" || input.platform === "youtube_short") && input.videoId) {
    return buildYoutubeUserTextCapture({
      canonicalUrl: input.canonicalUrl,
      platform: input.platform,
      videoId: input.videoId,
      userText: input.text,
      existingItem: input.item,
    });
  }
  if (input.platform === "linkedin") {
    return captureLinkedInUserText(input.canonicalUrl, input.text);
  }
  return null;
}
