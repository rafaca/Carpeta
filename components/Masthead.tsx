import Link from "next/link";

type Props = {
  issue?: string;
  variant?: "fixed" | "static";
};

export function Masthead({ issue = "20260508 / Vol·21", variant = "fixed" }: Props) {
  const positionClasses =
    variant === "fixed"
      ? "fixed inset-x-0 top-0 z-50 pointer-events-none"
      : "relative z-10";

  return (
    <header className={positionClasses}>
      <div
        className="pointer-events-auto flex h-[29px] items-center justify-center bg-chalk px-4 text-[12px] font-bold uppercase tracking-[1.44px] sm:px-0"
        style={{ lineHeight: "19.2px" }}
      >
        <span className="text-chalkInk">{issue}</span>
        <div className="absolute right-4 flex gap-3.5 sm:right-[312px]">
          <Link href="/#subscribe" className="text-flare hover:underline">
            Subscribe
          </Link>
          <Link href="/feed.xml" className="text-flare hover:underline">
            RSS
          </Link>
        </div>
      </div>
      <div className="pointer-events-auto flex h-[88px] items-center justify-center bg-ink">
        <Link
          href="/"
          aria-label="Those Who Play — home"
          className="font-script text-[64px] leading-none text-flare sm:text-[78px]"
          style={{ letterSpacing: "0.5px" }}
        >
          Those Who Play
        </Link>
      </div>
    </header>
  );
}
