import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing-page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CarForge AI — 3D Car Design Studio" },
      { name: "description", content: "CarForge AI is a digital vehicle customization studio with immersive 3D visualization, precise controls, and a professional garage experience." },
      { property: "og:title", content: "CarForge AI — 3D Car Design Studio" },
      { property: "og:description", content: "Design without limits. Refine without guesswork. Customize BMW M3, BYD Seal, and Porsche Manthey 911 GT3 RS in a premium 3D garage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "CarForge AI — 3D Car Design Studio" },
      { name: "twitter:description", content: "Design without limits. Refine without guesswork." },
    ],
  }),
  component: LandingPage,
});
