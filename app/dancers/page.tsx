import type { Metadata } from "next";
import { BubbleDancers } from "@/components/BubbleDancers";

export const metadata: Metadata = {
  title: "Those Who Play",
  description: "How do you find your people in a roaring world?",
};

/**
 * The new-homepage hero from public/twp-homepage.html, rebuilt in
 * React: headline over the bubble-dancers stage. When the full
 * homepage moves into the app, this section drops into app/page.tsx
 * as-is.
 */
export default function DancersPage() {
  return (
    <main className="min-h-dvh bg-[#E4FFFE] text-black">
      <section className="flex flex-col items-center px-6 pt-24">
        <h1
          className="max-w-4xl text-center font-serif text-[44px] leading-[1.16] md:text-[66px]"
          style={{ fontWeight: 300, letterSpacing: "0.01em" }}
        >
          How do you find your people in a roaring world?
        </h1>
      </section>
      <BubbleDancers className="mt-2 h-[min(54vh,560px)] min-h-[340px] w-full" background="#E4FFFE" />
    </main>
  );
}
