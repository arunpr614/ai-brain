import { redirect } from "next/navigation";

// Legacy route — v0.2.0 unified under /capture. Keep a 307 for any
// bookmark that survived v0.1.0.
export default function LegacyNewNote(): never {
  redirect("/capture?tab=note");
}
