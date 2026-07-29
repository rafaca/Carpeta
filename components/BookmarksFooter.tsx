type Bookmark = {
  source: string;
  title: string;
  desc: string;
  href?: string;
};

const defaultBookmarks: Bookmark[] = [
  {
    source: "Washington Post",
    title: "What Silicon Valley layoffs hide",
    desc: "The AI labor displacement the headline numbers aren't designed to show.",
  },
];

export function BookmarksFooter({ bookmarks = defaultBookmarks }: { bookmarks?: Bookmark[] }) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-ink py-12 text-bone sm:py-[60px]">
      <div className="mx-auto mb-6 flex max-w-column items-center gap-3 px-6 text-[14px] font-bold uppercase tracking-[1.12px] sm:mb-14">
        <span>{String(bookmarks.length).padStart(2, "0")}</span>
        <span>Bookmarks</span>
      </div>
      <ul className="mx-auto max-w-column space-y-8 px-6">
        {bookmarks.map((b, i) => (
          <li key={i}>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[1.12px] text-bone/70">
              {b.source}
            </p>
            <h3 className="mb-2 font-serif text-[18px] leading-snug text-bone">
              {b.href ? (
                <a href={b.href} className="hover:text-flare">
                  {b.title}
                </a>
              ) : (
                b.title
              )}
            </h3>
            <p className="font-light text-[15px] leading-relaxed text-bone/85">{b.desc}</p>
          </li>
        ))}
      </ul>
    </footer>
  );
}
