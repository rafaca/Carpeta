"use client";

import { useEffect, useRef } from "react";
import { mount, type DancersOptions } from "@/lib/bubble-dancers";

interface BubbleDancersProps extends DancersOptions {
  className?: string;
}

/**
 * Six raymarched droplet figures in a circle dance (pure WebGL, no
 * dependencies). Hover the stage calmly and they follow the cursor
 * pied-piper style; move fast and they scatter into freestyle; go
 * still and the circle dance resumes; touching the ring breaks it.
 *
 * Options are read once on mount — remount (key change) to apply
 * new figure/motion values, or use the instance API from
 * lib/bubble-dancers directly for live tweaking.
 */
export function BubbleDancers({ className, background, figure, motion }: BubbleDancersProps) {
  const host = useRef<HTMLDivElement>(null);
  const opts = useRef({ background, figure, motion });

  useEffect(() => {
    if (!host.current) return;
    const instance = mount(host.current, opts.current);
    return () => instance.destroy();
  }, []);

  return <div ref={host} className={className} aria-hidden="true" />;
}
