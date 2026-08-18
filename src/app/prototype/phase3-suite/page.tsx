import type { Metadata } from "next";
import { Phase3SuitePrototype } from "@/components/prototype/phase3-suite-prototype";

export const metadata: Metadata = {
  title: "Phase 3 Suite Sandbox · Repair Center (1A) & Processing Stream (2B) · AI Brain",
  description:
    "Interactive high-fidelity prototype for Capture Quality Repair Center (Option 1A), Processing Inbox High-Velocity Stream (Option 2B), and Integrated Reading Studio Hero.",
};

export default function Phase3SuitePage() {
  return <Phase3SuitePrototype initialView="repair-center" />;
}
