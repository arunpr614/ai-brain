"use client";

import { useRouter } from "next/navigation";
import { EnrichingPill } from "./enriching-pill";

/**
 * Wraps the EnrichingPill with a router.refresh() callback so the server
 * component re-renders when enrichment finishes — populates the digest
 * panel without a full page reload.
 */
export function ItemEnrichmentWatch({
  itemId,
  initialState,
}: {
  itemId: string;
  initialState: "pending" | "running" | "batched" | "done" | "error";
}) {
  const router = useRouter();
  return (
    <EnrichingPill
      itemId={itemId}
      initialState={initialState}
      onDone={() => router.refresh()}
    />
  );
}
