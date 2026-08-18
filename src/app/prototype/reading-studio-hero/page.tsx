import type { Metadata } from "next";
import { ReadingStudioHeroPrototype } from "@/components/prototype/reading-studio-hero-prototype";

export const metadata: Metadata = {
  title: "Option 2: Integrated Hero Workspace Banner · AI Brain Prototype",
  description:
    "Interactive high-fidelity prototype and UI/UX design evaluation for the Integrated Hero Workspace Banner in AI Brain.",
};

export default function ReadingStudioHeroPage() {
  return <ReadingStudioHeroPrototype />;
}
