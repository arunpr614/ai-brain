import type { ItemRow } from "@/db/client";
import {
  needsUpgradeReason,
  platformLabel,
  qualityLabel,
} from "@/lib/capture/quality";

export type AskScopeKind =
  | "library"
  | "item"
  | "selected"
  | "tag"
  | "topic"
  | "collection";

export interface AskScopeSource {
  id: string;
  title: string;
  platform: string;
  quality: string;
  limited: boolean;
  reason: string | null;
}

export interface AskScopeInfo {
  kind: AskScopeKind;
  label: string;
  sourceCount?: number;
  limitedCount: number;
  sources: AskScopeSource[];
  limitedSources: AskScopeSource[];
}

export function askScopeSourceFromItem(item: ItemRow): AskScopeSource {
  const reason = needsUpgradeReason({
    source_platform: item.source_platform,
    capture_quality: item.capture_quality,
    extraction_warning: item.extraction_warning,
  });
  return {
    id: item.id,
    title: item.title,
    platform: platformLabel(item.source_platform, item.source_type),
    quality: qualityLabel(item.capture_quality),
    limited: Boolean(reason),
    reason,
  };
}

export function buildAskScopeInfo({
  kind,
  label,
  items = [],
  sourceCount,
  limitedCount,
}: {
  kind: AskScopeKind;
  label: string;
  items?: ItemRow[];
  sourceCount?: number;
  limitedCount?: number;
}): AskScopeInfo {
  const sources = items.map(askScopeSourceFromItem);
  const limitedSources = sources.filter((source) => source.limited);
  return {
    kind,
    label,
    sourceCount: sourceCount ?? sources.length,
    limitedCount: limitedCount ?? limitedSources.length,
    sources,
    limitedSources,
  };
}
