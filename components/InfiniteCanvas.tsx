"use client";

import { useEffect, useRef, useState } from "react";

type Photo = { id: string; src: string; width?: number; height?: number };

const config = {
  minScale: 0.1,
  maxScale: 5,
  zoomStep: 0.2,
  friction: 0.92,
  minVelocity: 0.1,
  photoSizes: [
    { width: 300, height: 200 },
    { width: 250, height: 350 },
    { width: 400, height: 300 },
    { width: 200, height: 200 },
    { width: 350, height: 250 },
    { width: 280, height: 400 },
  ],
  gridSpacing: 40,
  chunkSize: 2000,
  viewPadding: 500,
};

function generateDemoPhotos(): Photo[] {
  const categories = ["nature", "city", "abstract", "people", "architecture"];
  return Array.from({ length: 50 }, (_, i) => {
    const w = 600 + Math.floor(Math.random() * 400);
    const h = 400 + Math.floor(Math.random() * 400);
    const cat = categories[i % categories.length];
    return { id: `demo-${i}`, src: `https://picsum.photos/seed/${cat}${i}/${w}/${h}`, width: w, height: h };
  });
}

function hashCode(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export function InfiniteCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const state = {
      scale: 1,
      tx: 0,
      ty: 0,
      isDragging: false,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      vx: 0,
      vy: 0,
      lastMove: 0,
      pinchDist: 0,
      initialScale: 1,
    };

    const loadedChunks = new Set<string>();
    const photoElements = new Map<string, HTMLDivElement>();
    let photos: Photo[] = [];
    let raf: number | null = null;

    const updateTransform = () => {
      canvas.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`;
    };

    const updateZoom = () => setZoom(Math.round(state.scale * 100));

    const createPhotoEl = (key: string, photo: Photo, x: number, y: number, w: number, h: number) => {
      const el = document.createElement("div");
      el.className =
        "absolute overflow-hidden rounded-lg bg-neutral-900 shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-shadow duration-300 hover:shadow-[0_15px_60px_rgba(0,0,0,0.7)]";
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;

      const ph = document.createElement("div");
      ph.className =
        "absolute inset-0 grid place-items-center bg-gradient-to-br from-neutral-900 to-neutral-800";
      el.appendChild(ph);

      const img = document.createElement("img");
      img.alt = photo.id || "Photo";
      img.loading = "lazy";
      img.className = "block h-full w-full object-cover opacity-0 transition-opacity duration-500";
      img.onload = () => {
        img.style.opacity = "1";
        ph.remove();
      };
      img.onerror = () => {
        ph.innerHTML = '<span class="text-xs text-neutral-500">Failed to load</span>';
      };
      img.src = photo.src;
      el.appendChild(img);

      canvas.appendChild(el);
      photoElements.set(key, el);
    };

    const loadChunk = (cx: number, cy: number) => {
      const key = `${cx},${cy}`;
      if (loadedChunks.has(key)) return;
      loadedChunks.add(key);

      const rng = seededRandom(hashCode(key));
      const numPhotos = 8 + Math.floor(rng() * 5);
      const baseX = cx * config.chunkSize;
      const baseY = cy * config.chunkSize;

      for (let i = 0; i < numPhotos; i++) {
        const photo = photos[Math.floor(rng() * photos.length)];
        const size = config.photoSizes[Math.floor(rng() * config.photoSizes.length)];
        const x = baseX + rng() * (config.chunkSize - size.width - config.gridSpacing);
        const y = baseY + rng() * (config.chunkSize - size.height - config.gridSpacing);
        createPhotoEl(`${key}-${i}`, photo, x, y, size.width, size.height);
      }
    };

    const unloadChunk = (key: string) => {
      for (const [pk, el] of photoElements) {
        if (pk.startsWith(`${key}-`)) {
          el.remove();
          photoElements.delete(pk);
        }
      }
      loadedChunks.delete(key);
    };

    const updateVisible = () => {
      const rect = container.getBoundingClientRect();
      const pad = config.viewPadding;
      const cs = config.chunkSize;
      const left = (-state.tx - pad) / state.scale;
      const top = (-state.ty - pad) / state.scale;
      const right = (rect.width - state.tx + pad) / state.scale;
      const bottom = (rect.height - state.ty + pad) / state.scale;

      const sx = Math.floor(left / cs);
      const ex = Math.floor(right / cs);
      const sy = Math.floor(top / cs);
      const ey = Math.floor(bottom / cs);

      const needed = new Set<string>();
      for (let cx = sx; cx <= ex; cx++) {
        for (let cy = sy; cy <= ey; cy++) {
          const key = `${cx},${cy}`;
          needed.add(key);
          if (!loadedChunks.has(key)) loadChunk(cx, cy);
        }
      }
      for (const key of loadedChunks) {
        if (!needed.has(key)) unloadChunk(key);
      }
    };

    const cancelMomentum = () => {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };

    const startMomentum = () => {
      cancelMomentum();
      const animate = () => {
        state.vx *= config.friction;
        state.vy *= config.friction;
        if (Math.abs(state.vx) < config.minVelocity && Math.abs(state.vy) < config.minVelocity) return;
        state.tx += state.vx;
        state.ty += state.vy;
        updateTransform();
        updateVisible();
        raf = requestAnimationFrame(animate);
      };
      raf = requestAnimationFrame(animate);
    };

    const zoomAt = (x: number, y: number, delta: number) => {
      const old = state.scale;
      const next = Math.max(config.minScale, Math.min(config.maxScale, old + delta));
      if (next === old) return;
      const cx = (x - state.tx) / old;
      const cy = (y - state.ty) / old;
      state.scale = next;
      state.tx = x - cx * state.scale;
      state.ty = y - cy * state.scale;
      updateTransform();
      updateZoom();
      updateVisible();
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      state.isDragging = true;
      state.startX = e.clientX - state.tx;
      state.startY = e.clientY - state.ty;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      state.lastMove = Date.now();
      state.vx = 0;
      state.vy = 0;
      container.classList.add("dragging");
      cancelMomentum();
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!state.isDragging) return;
      const now = Date.now();
      const dt = now - state.lastMove;
      if (dt > 0) {
        state.vx = ((e.clientX - state.lastX) / dt) * 16;
        state.vy = ((e.clientY - state.lastY) / dt) * 16;
      }
      state.tx = e.clientX - state.startX;
      state.ty = e.clientY - state.startY;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      state.lastMove = now;
      updateTransform();
      updateVisible();
    };
    const onMouseUp = () => {
      if (!state.isDragging) return;
      state.isDragging = false;
      container.classList.remove("dragging");
      if (Math.abs(state.vx) > config.minVelocity || Math.abs(state.vy) > config.minVelocity) {
        startMomentum();
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, -Math.sign(e.deltaY) * config.zoomStep);
    };

    const pinchDist = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        state.isDragging = true;
        state.startX = t.clientX - state.tx;
        state.startY = t.clientY - state.ty;
        state.lastX = t.clientX;
        state.lastY = t.clientY;
        state.lastMove = Date.now();
        state.vx = 0;
        state.vy = 0;
        cancelMomentum();
      } else if (e.touches.length === 2) {
        e.preventDefault();
        state.isDragging = false;
        state.pinchDist = pinchDist(e.touches);
        state.initialScale = state.scale;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && state.isDragging) {
        const t = e.touches[0];
        const now = Date.now();
        const dt = now - state.lastMove;
        if (dt > 0) {
          state.vx = ((t.clientX - state.lastX) / dt) * 16;
          state.vy = ((t.clientY - state.lastY) / dt) * 16;
        }
        state.tx = t.clientX - state.startX;
        state.ty = t.clientY - state.startY;
        state.lastX = t.clientX;
        state.lastY = t.clientY;
        state.lastMove = now;
        updateTransform();
        updateVisible();
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const cur = pinchDist(e.touches);
        const ratio = cur / state.pinchDist;
        const cxScreen = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cyScreen = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const rect = container.getBoundingClientRect();
        const next = Math.max(
          config.minScale,
          Math.min(config.maxScale, state.initialScale * ratio),
        );
        const canvasX = (cxScreen - rect.left - state.tx) / state.scale;
        const canvasY = (cyScreen - rect.top - state.ty) / state.scale;
        state.scale = next;
        state.tx = cxScreen - rect.left - canvasX * state.scale;
        state.ty = cyScreen - rect.top - canvasY * state.scale;
        updateTransform();
        updateZoom();
        updateVisible();
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        state.isDragging = false;
        if (Math.abs(state.vx) > config.minVelocity || Math.abs(state.vy) > config.minVelocity) {
          startMomentum();
        }
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        state.isDragging = true;
        state.startX = t.clientX - state.tx;
        state.startY = t.clientY - state.ty;
        state.lastX = t.clientX;
        state.lastY = t.clientY;
      }
    };

    const onKey = (e: KeyboardEvent) => {
      const pan = 100;
      switch (e.key) {
        case "ArrowUp": state.ty += pan; break;
        case "ArrowDown": state.ty -= pan; break;
        case "ArrowLeft": state.tx += pan; break;
        case "ArrowRight": state.tx -= pan; break;
        case "+": case "=": zoomBy(config.zoomStep); return;
        case "-": zoomBy(-config.zoomStep); return;
        case "0": resetView(); return;
        default: return;
      }
      updateTransform();
      updateVisible();
    };

    const zoomBy = (delta: number) => {
      const rect = container.getBoundingClientRect();
      zoomAt(rect.width / 2, rect.height / 2, delta);
    };

    const center = () => {
      const rect = container.getBoundingClientRect();
      state.tx = rect.width / 2;
      state.ty = rect.height / 2;
    };

    const resetView = () => {
      state.scale = 1;
      center();
      updateTransform();
      updateZoom();
      updateVisible();
    };

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("touchstart", onTouchStart, { passive: false });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", updateVisible);

    const ctrls = {
      "zoom-in": () => zoomBy(config.zoomStep),
      "zoom-out": () => zoomBy(-config.zoomStep),
      reset: resetView,
    };
    const handlers: Array<[HTMLElement, () => void]> = [];
    for (const [id, fn] of Object.entries(ctrls)) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("click", fn);
        handlers.push([el, fn]);
      }
    }

    (async () => {
      try {
        const res = await fetch("/photos.json");
        if (res.ok) {
          const data = await res.json();
          photos = data.photos || [];
        }
      } catch {
        /* fall through */
      }
      if (photos.length === 0) photos = generateDemoPhotos();
      center();
      updateTransform();
      updateVisible();
      setLoading(false);
    })();

    return () => {
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", updateVisible);
      for (const [el, fn] of handlers) el.removeEventListener("click", fn);
      cancelMomentum();
      for (const el of photoElements.values()) el.remove();
      photoElements.clear();
      loadedChunks.clear();
    };
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-grab overflow-hidden active:cursor-grabbing"
      >
        <div ref={canvasRef} className="absolute will-change-transform" style={{ transformOrigin: "0 0" }} />
      </div>

      <div className="fixed right-6 top-32 z-40 flex flex-col gap-2">
        <div className="min-w-[60px] rounded-full bg-white/10 px-3 py-2 text-center text-xs text-white backdrop-blur">
          {zoom}%
        </div>
        <button
          id="zoom-in"
          aria-label="Zoom in"
          className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-xl text-white backdrop-blur transition hover:scale-110 hover:bg-white/20"
        >
          +
        </button>
        <button
          id="zoom-out"
          aria-label="Zoom out"
          className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-xl text-white backdrop-blur transition hover:scale-110 hover:bg-white/20"
        >
          −
        </button>
        <button
          id="reset"
          aria-label="Reset view"
          className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-xl text-white backdrop-blur transition hover:scale-110 hover:bg-white/20"
        >
          ⟲
        </button>
      </div>

      {loading && (
        <div className="fixed inset-0 z-[1000] grid place-items-center gap-4 bg-ink text-white">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <p>Loading photos…</p>
        </div>
      )}
    </>
  );
}
