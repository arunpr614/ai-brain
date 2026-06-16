import { ShareResultClient } from "./share-result-client";

export default async function CaptureShareResultPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; state?: string }>;
}) {
  const { key, state } = await searchParams;
  return <ShareResultClient resultKey={key ?? null} fixtureState={state ?? null} />;
}
