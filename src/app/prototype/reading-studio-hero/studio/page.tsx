import type { Metadata } from "next";
import { ReadingStudioHeroPrototype } from "@/components/prototype/reading-studio-hero-prototype";

export const metadata: Metadata = {
  title: "Dedicated Reading Studio Page · AI Brain Prototype",
  description:
    "Interactive high-fidelity prototype of the dedicated full-page Reading Studio experience.",
};

export default function DedicatedReadingStudioPage() {
  return <ReadingStudioHeroPrototype initialPageView="studio" />;
}
