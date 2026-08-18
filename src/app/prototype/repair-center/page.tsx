import type { Metadata } from "next";
import { Phase3SuitePrototype } from "@/components/prototype/phase3-suite-prototype";

export const metadata: Metadata = {
  title: "Capture Quality Repair Center (Option 1A) · AI Brain Prototype",
  description:
    "Health Diagnostic Matrix & Categorized Triage Deck with local Mac Apple Neural Engine Whisper ASR simulation.",
};

export default function RepairCenterPage() {
  return <Phase3SuitePrototype initialView="repair-center" />;
}
