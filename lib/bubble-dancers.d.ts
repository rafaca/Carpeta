export interface DancersInstance {
  /** Tear down the canvas, observers and listeners (for unmount). */
  destroy(): void;
  canvas: HTMLCanvasElement;
  /** Live-editable figure proportions (see lib/bubble-dancers.js FIGURE). */
  figure: Record<string, number>;
  /** Live-editable choreography values (see MOTION). */
  motion: Record<string, number>;
  /** Repaint the whole scene from a new background hex, e.g. "#E4FFFE". */
  setBackground(hex: string): void;
}

export interface DancersOptions {
  /** Hex colour the whole scene derives from. Default "#E4FFFE". */
  background?: string;
  /** Overrides for figure proportions (size, head, torso, ...). */
  figure?: Record<string, number>;
  /** Overrides for choreography (tempo, circle, bounce, jump, sway, lines). */
  motion?: Record<string, number>;
}

/**
 * Mount the bubble dancers into a container. The canvas fills the
 * container and resizes with it. Interaction: hover calmly and the
 * troupe follows the cursor pied-piper style; move fast and they
 * scatter into freestyle; go still and the circle dance resumes;
 * touching the ring breaks it.
 */
export function mount(target: string | HTMLElement, opts?: DancersOptions): DancersInstance;
