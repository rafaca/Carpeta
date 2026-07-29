import type { Metadata } from "next";
import { BubbleDancers } from "@/components/BubbleDancers";

export const metadata: Metadata = {
  title: "Those Who Play",
  description: "How do you find your people in a roaring world?",
};

/**
 * The new-homepage hero from public/twp-homepage.html, rebuilt in
 * React: the dancers live as a full-page, click-through background
 * layer under all content (Figma gradient #FFFFFF -> #E4FFFE at
 * 61%). When the full homepage moves into the app, the layer and
 * hero drop into app/page.tsx as-is.
 */
export default function DancersPage() {
  return (
    <main className="relative min-h-dvh text-black">
      <BubbleDancers
        className="pointer-events-none fixed inset-0 z-0"
        background="#E4FFFE"
        backgroundTop="#FFFFFF"
        backgroundStop={0.61}
        pointer="window"
      />
      <section className="relative z-10 flex flex-col items-center px-6 pt-24">
        <h1
          className="max-w-4xl text-center font-serif text-[44px] leading-[1.16] md:text-[66px]"
          style={{ fontWeight: 300, letterSpacing: "0.01em" }}
        >
          How do you find your people in a roaring world?
        </h1>
      </section>
    </main>
  );
}
