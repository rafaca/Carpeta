import Link from "next/link";
import { Masthead } from "@/components/Masthead";
import { BookmarksFooter } from "@/components/BookmarksFooter";
import { Callout } from "@/components/Callout";
import { InfiniteCanvas } from "@/components/InfiniteCanvas";

export default function HomePage() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-ink">
      <Masthead />
      <InfiniteCanvas />

      <nav className="fixed right-6 top-6 z-50">
        <Link
          href="/network"
          className="inline-block rounded-full bg-white/10 px-4 py-2 text-xs text-bone/85 backdrop-blur transition hover:bg-white/20 hover:text-white"
        >
          Creator network →
        </Link>
      </nav>

      <Callout
        quote="Generally AI companies distill other AI companies."
        attribution="Elon Musk, under oath"
        className="fixed bottom-72 left-6 z-40 hidden md:block"
      />

      <BookmarksFooter />
    </main>
  );
}
