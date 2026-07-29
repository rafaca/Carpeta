type Props = {
  quote: string;
  attribution: string;
  className?: string;
};

export function Callout({ quote, attribution, className = "" }: Props) {
  return (
    <figure
      className={`max-w-column border-l-2 border-flare bg-sky px-6 py-3 text-skyInk ${className}`}
    >
      <blockquote className="text-[24px] leading-[30px] tracking-[-0.24px]">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className="mt-2.5 text-[12px] uppercase tracking-[0.12em] text-skyInk">
        {attribution}
      </figcaption>
    </figure>
  );
}
