import { InboxClient } from "./inbox-client";

/**
 * /inbox — outbox state surface (OFFLINE-7 / plan v3 §5.7).
 *
 * Thin server-component wrapper. The actual content rendering is
 * client-side because the outbox is per-device IDB state (the server
 * doesn't have it). This file exists so the route is registered with
 * Next.js — the work happens in inbox-client.tsx.
 */
export default function InboxPage() {
  return <InboxClient />;
}

export const metadata = {
  title: "Inbox · AI Brain",
};
