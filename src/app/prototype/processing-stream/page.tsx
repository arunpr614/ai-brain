import type { Metadata } from "next";
import { Phase3SuitePrototype } from "@/components/prototype/phase3-suite-prototype";

export const metadata: Metadata = {
  title: "Processing Inbox & High-Velocity Stream (Option 2B) · AI Brain Prototype",
  description:
    "Dense linear stream with instant live peek, cognitive source chips, and sub-second keyboard triage shortcuts.",
};

export default function ProcessingStreamPage() {
  return <Phase3SuitePrototype initialView="processing-stream" />;
}
