import { fingerprint } from "./crypto";
import type { ProcessingFilters } from "./types";

export function normalizeProcessingFilters(filters: ProcessingFilters): ProcessingFilters {
  const clean = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
  return {
    userTagIds: clean(filters.userTagIds).slice(0, 20),
    aiTopicIds: clean(filters.aiTopicIds).slice(0, 20),
    noUserTags: Boolean(filters.noUserTags),
    noAiTopics: Boolean(filters.noAiTopics),
  };
}

export function processingFilterHash(filters: ProcessingFilters): string {
  return fingerprint(normalizeProcessingFilters(filters));
}

export function processingFilterSql(filters: ProcessingFilters, alias = "i") {
  const normalized = normalizeProcessingFilters(filters);
  const clauses: string[] = [];
  const params: unknown[] = [];
  const userAlternatives: string[] = [];
  if (normalized.userTagIds.length > 0) {
    userAlternatives.push(`EXISTS (SELECT 1 FROM item_tags fit JOIN tags ft ON ft.id=fit.tag_id
      WHERE fit.item_id=${alias}.id AND ft.kind='manual' AND ft.id IN (${normalized.userTagIds.map(() => "?").join(",")}))`);
    params.push(...normalized.userTagIds);
  }
  if (normalized.noUserTags) userAlternatives.push(`NOT EXISTS (SELECT 1 FROM item_tags fit JOIN tags ft ON ft.id=fit.tag_id WHERE fit.item_id=${alias}.id AND ft.kind='manual')`);
  if (userAlternatives.length) clauses.push(`(${userAlternatives.join(" OR ")})`);
  const topicAlternatives: string[] = [];
  if (normalized.aiTopicIds.length > 0) {
    topicAlternatives.push(`EXISTS (SELECT 1 FROM item_topics fip WHERE fip.item_id=${alias}.id AND fip.topic_id IN (${normalized.aiTopicIds.map(() => "?").join(",")}))`);
    params.push(...normalized.aiTopicIds);
  }
  if (normalized.noAiTopics) topicAlternatives.push(`NOT EXISTS (SELECT 1 FROM item_topics fip WHERE fip.item_id=${alias}.id)`);
  if (topicAlternatives.length) clauses.push(`(${topicAlternatives.join(" OR ")})`);
  return { clause: clauses.length ? clauses.join(" AND ") : "1=1", params, normalized };
}
