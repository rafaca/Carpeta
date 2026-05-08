"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

type Creator = {
  id: string;
  name: string;
  handle?: string;
  bio?: string;
  followers?: number;
  categories?: string[];
  follows?: string[];
  collaborations?: string[];
};

type Node = Creator & d3.SimulationNodeDatum & { degree?: number };
type Link = d3.SimulationLinkDatum<Node> & { weight: number; types: string[] };

const EDGE_WEIGHTS = { category: 1, follow: 2, collab: 3 } as const;
type EdgeType = keyof typeof EDGE_WEIGHTS;

type SizeMode = "connections" | "followers" | "uniform";

export function CreatorNetwork() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [edgeTypes, setEdgeTypes] = useState<Set<EdgeType>>(
    new Set(["category", "follow", "collab"]),
  );
  const [sizeMode, setSizeMode] = useState<SizeMode>("connections");
  const [linkDistance, setLinkDistance] = useState(90);
  const [chargeStrength, setChargeStrength] = useState(-220);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Node | null>(null);
  const [hovered, setHovered] = useState<Node | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // Persistent simulation state across renders.
  const stateRef = useRef<{
    nodes: Node[];
    links: Link[];
    sim?: d3.Simulation<Node, Link>;
    color?: d3.ScaleOrdinal<string, string>;
    zoom?: d3.ZoomBehavior<SVGSVGElement, unknown>;
  }>({ nodes: [], links: [] });

  // Load creator data once.
  useEffect(() => {
    (async () => {
      for (const src of ["/creators.json", "/creators.sample.json"]) {
        try {
          const res = await fetch(src);
          if (res.ok) {
            const data = await res.json();
            setCreators(data.creators || []);
            if (src.endsWith("sample.json")) {
              setStatus(
                "Showing sample data. Drop a creators.json into /public to see your own.",
              );
            }
            return;
          }
        } catch {
          /* try next */
        }
      }
      setStatus("No creator data found. Add /public/creators.json (see creators.sample.json).");
    })();
  }, []);

  // Build categories + color scale when creators change.
  useEffect(() => {
    const cats = new Set<string>();
    for (const c of creators) (c.categories || []).forEach((x) => cats.add(x));
    const sorted = [...cats].sort();
    setCategories(sorted);
    stateRef.current.color = d3
      .scaleOrdinal<string, string>()
      .domain(sorted)
      .range([...d3.schemeTableau10, ...d3.schemeSet3]);
  }, [creators]);

  // Build/maintain simulation.
  useEffect(() => {
    const svgEl = svgRef.current;
    const container = containerRef.current;
    if (!svgEl || !container || creators.length === 0) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    const root = svg.append("g");
    const linkG = root.append("g").attr("class", "links");
    const nodeG = root.append("g").attr("class", "nodes");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (e) => root.attr("transform", e.transform.toString()));
    svg.call(zoom);
    stateRef.current.zoom = zoom;

    const nodes: Node[] = creators.map((c) => ({ ...c }));
    stateRef.current.nodes = nodes;

    const rebuildLinks = () => {
      const links: Link[] = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const types = new Set<EdgeType>();
          let weight = 0;
          if (edgeTypes.has("category")) {
            const aCats = new Set(a.categories || []);
            const shared = (b.categories || []).filter((c) => aCats.has(c));
            if (shared.length > 0) {
              types.add("category");
              weight += shared.length * EDGE_WEIGHTS.category;
            }
          }
          if (edgeTypes.has("follow")) {
            const aFb = (a.follows || []).includes(b.id);
            const bFa = (b.follows || []).includes(a.id);
            if (aFb && bFa) {
              types.add("follow");
              weight += 2 * EDGE_WEIGHTS.follow;
            } else if (aFb || bFa) {
              types.add("follow");
              weight += EDGE_WEIGHTS.follow;
            }
          }
          if (edgeTypes.has("collab")) {
            const aC = (a.collaborations || []).includes(b.id);
            const bC = (b.collaborations || []).includes(a.id);
            if (aC || bC) {
              types.add("collab");
              weight += EDGE_WEIGHTS.collab;
            }
          }
          if (weight > 0) {
            links.push({ source: a.id, target: b.id, weight, types: [...types] });
          }
        }
      }
      const degree = new Map<string, number>();
      for (const l of links) {
        const sId = typeof l.source === "object" ? (l.source as Node).id : (l.source as string);
        const tId = typeof l.target === "object" ? (l.target as Node).id : (l.target as string);
        degree.set(sId, (degree.get(sId) || 0) + l.weight);
        degree.set(tId, (degree.get(tId) || 0) + l.weight);
      }
      for (const n of nodes) n.degree = degree.get(n.id) || 0;
      stateRef.current.links = links;
      return links;
    };

    const radius = (d: Node) => {
      const base = 8;
      if (sizeMode === "connections") return base + Math.sqrt(d.degree || 0) * 2.2;
      if (sizeMode === "followers") return base + Math.sqrt(d.followers || 0) / 10;
      return base + 4;
    };

    const color = (d: Node) =>
      stateRef.current.color ? stateRef.current.color((d.categories || ["other"])[0]) : "#888";

    const links = rebuildLinks();
    const rect = container.getBoundingClientRect();
    svg.attr("width", rect.width).attr("height", rect.height);

    const sim = d3
      .forceSimulation<Node>(nodes)
      .force(
        "link",
        d3
          .forceLink<Node, Link>(links)
          .id((d) => d.id)
          .distance(linkDistance)
          .strength((l) => Math.min(1, (l as Link).weight / 6)),
      )
      .force("charge", d3.forceManyBody<Node>().strength(chargeStrength))
      .force("center", d3.forceCenter(rect.width / 2, rect.height / 2))
      .force("collide", d3.forceCollide<Node>().radius((d) => radius(d) + 3))
      .on("tick", () => {
        linkG
          .selectAll<SVGLineElement, Link>("line")
          .attr("x1", (d) => (d.source as Node).x ?? 0)
          .attr("y1", (d) => (d.source as Node).y ?? 0)
          .attr("x2", (d) => (d.target as Node).x ?? 0)
          .attr("y2", (d) => (d.target as Node).y ?? 0);
        nodeG
          .selectAll<SVGGElement, Node>("g.node")
          .attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });
    stateRef.current.sim = sim;

    const drag = d3
      .drag<SVGGElement, Node>()
      .on("start", (e, d) => {
        if (!e.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (e, d) => {
        d.fx = e.x;
        d.fy = e.y;
      })
      .on("end", (e, d) => {
        if (!e.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    const renderGraph = () => {
      linkG
        .selectAll<SVGLineElement, Link>("line")
        .data(stateRef.current.links, (d) => {
          const sId = typeof d.source === "object" ? (d.source as Node).id : (d.source as string);
          const tId = typeof d.target === "object" ? (d.target as Node).id : (d.target as string);
          return `${sId}|${tId}`;
        })
        .join(
          (enter) =>
            enter
              .append("line")
              .attr("class", (d) => `link ${d.types.map((t) => `type-${t}`).join(" ")}`)
              .attr("stroke-width", (d) => Math.max(1, Math.sqrt(d.weight))),
          (update) =>
            update
              .attr("class", (d) => `link ${d.types.map((t) => `type-${t}`).join(" ")}`)
              .attr("stroke-width", (d) => Math.max(1, Math.sqrt(d.weight))),
          (exit) => exit.remove(),
        );

      const nodeSel = nodeG
        .selectAll<SVGGElement, Node>("g.node")
        .data(nodes, (d) => d.id)
        .join(
          (enter) => {
            const g = enter
              .append("g")
              .attr("class", "node")
              .call(drag)
              .on("click", (event, d) => {
                event.stopPropagation();
                setSelected((cur) => (cur && cur.id === d.id ? null : d));
              })
              .on("mouseenter", (_e, d) => setHovered(d))
              .on("mouseleave", () => setHovered(null));
            g.append("circle");
            g.append("text").attr("class", "label");
            return g;
          },
          (update) => update,
          (exit) => exit.remove(),
        );

      nodeSel.select<SVGCircleElement>("circle").attr("r", radius).attr("fill", color);
      nodeSel
        .select<SVGTextElement>("text.label")
        .attr("dy", (d) => -(radius(d) + 4))
        .text((d) => d.name);
    };

    renderGraph();

    svgEl.addEventListener("click", () => setSelected(null));
    const onResize = () => {
      const r = container.getBoundingClientRect();
      svg.attr("width", r.width).attr("height", r.height);
      sim.force("center", d3.forceCenter(r.width / 2, r.height / 2));
      sim.alpha(0.3).restart();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      sim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creators]);

  // React to control changes by mutating the simulation.
  useEffect(() => {
    const sim = stateRef.current.sim;
    if (!sim) return;
    sim.force<d3.ForceLink<Node, Link>>("link")?.distance(linkDistance);
    sim.alpha(0.4).restart();
  }, [linkDistance]);

  useEffect(() => {
    const sim = stateRef.current.sim;
    if (!sim) return;
    sim.force<d3.ForceManyBody<Node>>("charge")?.strength(chargeStrength);
    sim.alpha(0.4).restart();
  }, [chargeStrength]);

  // Apply highlight on hover/selected/search.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const term = search.trim().toLowerCase();
    const target = selected || hovered;
    const matched = new Set<string>();
    if (target) matched.add(target.id);
    if (term) {
      for (const n of stateRef.current.nodes) {
        if (
          n.name.toLowerCase().includes(term) ||
          (n.handle || "").toLowerCase().includes(term) ||
          (n.categories || []).some((c) => c.toLowerCase().includes(term))
        ) {
          matched.add(n.id);
        }
      }
    }
    const active = matched.size > 0;
    const neighbors = new Set(matched);
    if (active) {
      for (const l of stateRef.current.links) {
        const sId = typeof l.source === "object" ? (l.source as Node).id : (l.source as string);
        const tId = typeof l.target === "object" ? (l.target as Node).id : (l.target as string);
        if (matched.has(sId)) neighbors.add(tId);
        if (matched.has(tId)) neighbors.add(sId);
      }
    }
    d3.select(svg)
      .selectAll<SVGGElement, Node>("g.node")
      .classed("dim", (d) => active && !neighbors.has(d.id))
      .classed("active", (d) => matched.has(d.id));
    d3.select(svg)
      .selectAll<SVGLineElement, Link>("line")
      .classed("dim", (d) => {
        if (!active) return false;
        const sId = typeof d.source === "object" ? (d.source as Node).id : (d.source as string);
        const tId = typeof d.target === "object" ? (d.target as Node).id : (d.target as string);
        return !matched.has(sId) && !matched.has(tId);
      });
  }, [hovered, selected, search]);

  // React to edge-type / sizeMode by re-running the layout (cheap approach: rebuild).
  useEffect(() => {
    const sim = stateRef.current.sim;
    if (!sim) return;
    // Rebuild links from scratch to honor edgeTypes.
    const links: Link[] = [];
    const nodes = stateRef.current.nodes;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const types = new Set<EdgeType>();
        let weight = 0;
        if (edgeTypes.has("category")) {
          const aCats = new Set(a.categories || []);
          const shared = (b.categories || []).filter((c) => aCats.has(c));
          if (shared.length > 0) {
            types.add("category");
            weight += shared.length * EDGE_WEIGHTS.category;
          }
        }
        if (edgeTypes.has("follow")) {
          const aFb = (a.follows || []).includes(b.id);
          const bFa = (b.follows || []).includes(a.id);
          if (aFb && bFa) {
            types.add("follow");
            weight += 2 * EDGE_WEIGHTS.follow;
          } else if (aFb || bFa) {
            types.add("follow");
            weight += EDGE_WEIGHTS.follow;
          }
        }
        if (edgeTypes.has("collab")) {
          const aC = (a.collaborations || []).includes(b.id);
          const bC = (b.collaborations || []).includes(a.id);
          if (aC || bC) {
            types.add("collab");
            weight += EDGE_WEIGHTS.collab;
          }
        }
        if (weight > 0) {
          links.push({ source: a.id, target: b.id, weight, types: [...types] });
        }
      }
    }
    const degree = new Map<string, number>();
    for (const l of links) {
      const sId = typeof l.source === "object" ? (l.source as Node).id : (l.source as string);
      const tId = typeof l.target === "object" ? (l.target as Node).id : (l.target as string);
      degree.set(sId, (degree.get(sId) || 0) + l.weight);
      degree.set(tId, (degree.get(tId) || 0) + l.weight);
    }
    for (const n of nodes) n.degree = degree.get(n.id) || 0;
    stateRef.current.links = links;
    sim.force<d3.ForceLink<Node, Link>>("link")?.links(links);
    sim.alpha(0.6).restart();
  }, [edgeTypes]);

  useEffect(() => {
    const sim = stateRef.current.sim;
    if (!sim) return;
    const radius = (d: Node) => {
      const base = 8;
      if (sizeMode === "connections") return base + Math.sqrt(d.degree || 0) * 2.2;
      if (sizeMode === "followers") return base + Math.sqrt(d.followers || 0) / 10;
      return base + 4;
    };
    sim.force("collide", d3.forceCollide<Node>().radius((d) => radius(d) + 3));
    if (svgRef.current) {
      d3.select(svgRef.current)
        .selectAll<SVGCircleElement, Node>("g.node circle")
        .attr("r", radius);
    }
    sim.alpha(0.3).restart();
  }, [sizeMode]);

  const detail = selected || hovered;
  const color = stateRef.current.color;

  return (
    <div className="flex h-dvh w-full flex-col bg-ink text-bone md:flex-row">
      <aside className="flex w-full max-h-[45%] flex-col gap-5 overflow-y-auto border-b border-white/5 bg-[#111] p-5 md:max-h-none md:w-[280px] md:flex-shrink-0 md:border-b-0 md:border-r">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Creator Network</h1>
          <p className="mt-1 text-xs text-bone/40">Instagram creators and how they connect</p>
        </div>

        <Panel title="Connections">
          {(["category", "follow", "collab"] as EdgeType[]).map((type) => (
            <Check
              key={type}
              label={
                type === "category"
                  ? "Shared category"
                  : type === "follow"
                    ? "Mutual follows"
                    : "Collaborations"
              }
              checked={edgeTypes.has(type)}
              onChange={(checked) =>
                setEdgeTypes((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add(type);
                  else next.delete(type);
                  return next;
                })
              }
            />
          ))}
        </Panel>

        <Panel title="Node size">
          {(["connections", "followers", "uniform"] as SizeMode[]).map((mode) => (
            <Radio
              key={mode}
              label={
                mode === "connections"
                  ? "By connections"
                  : mode === "followers"
                    ? "By followers"
                    : "Uniform"
              }
              checked={sizeMode === mode}
              onChange={() => setSizeMode(mode)}
              name="size"
            />
          ))}
        </Panel>

        <Panel title="Layout">
          <Slider label="Link distance" min={30} max={220} value={linkDistance} onChange={setLinkDistance} />
          <Slider label="Repulsion" min={-500} max={-20} value={chargeStrength} onChange={setChargeStrength} />
        </Panel>

        <Panel title="Search">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a creator…"
            autoComplete="off"
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25 focus:bg-white/10"
          />
        </Panel>

        <Panel title="Details">
          {!detail ? (
            <div className="text-xs italic text-bone/35">Hover or click a node to see details.</div>
          ) : (
            <div className="space-y-1.5 text-xs">
              <h3 className="text-[15px] font-semibold text-white">{detail.name}</h3>
              {detail.handle && (
                <p>
                  <a
                    href={`https://instagram.com/${encodeURIComponent(detail.handle)}`}
                    target="_blank"
                    rel="noopener"
                    className="text-[#8ab4ff] hover:underline"
                  >
                    @{detail.handle}
                  </a>
                </p>
              )}
              {detail.followers != null && (
                <p>
                  <strong>{detail.followers.toLocaleString()}</strong> followers
                </p>
              )}
              <p>
                {detail.degree || 0} weighted connection{detail.degree === 1 ? "" : "s"}
              </p>
              <div className="my-1.5 flex flex-wrap gap-1">
                {(detail.categories || []).map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-bone/80"
                  >
                    {c}
                  </span>
                ))}
              </div>
              {detail.bio && <p className="italic text-bone/55">{detail.bio}</p>}
            </div>
          )}
        </Panel>

        <Panel title="Categories">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-1 text-[11px] text-bone/70"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: color ? color(c) : "#888" }}
                />
                {c}
              </span>
            ))}
          </div>
        </Panel>

        <nav className="mt-auto border-t border-white/5 pt-4">
          <a href="/" className="text-xs text-bone/50 hover:text-white">
            ← Infinite photo canvas
          </a>
        </nav>
      </aside>

      <main ref={containerRef} className="relative flex-1 overflow-hidden">
        <svg
          ref={svgRef}
          aria-label="Force-directed network of creators"
          className="block h-full w-full cursor-grab active:cursor-grabbing"
          style={
            {
              ["--link-default" as string]: "rgba(255,255,255,0.18)",
            } as React.CSSProperties
          }
        />
        <style jsx>{`
          :global(.link) {
            stroke: var(--link-default);
            stroke-linecap: round;
            transition:
              stroke 0.2s ease,
              stroke-opacity 0.2s ease;
          }
          :global(.link.type-collab) {
            stroke: rgba(255, 180, 120, 0.45);
          }
          :global(.link.type-follow) {
            stroke: rgba(130, 200, 255, 0.38);
          }
          :global(.link.type-category) {
            stroke: rgba(255, 255, 255, 0.14);
          }
          :global(.link.dim) {
            stroke-opacity: 0.05;
          }
          :global(.node circle) {
            stroke: #0a0a0a;
            stroke-width: 1.5;
            cursor: pointer;
            transition:
              stroke 0.2s ease,
              stroke-width 0.2s ease;
          }
          :global(.node:hover circle) {
            stroke: #fff;
            stroke-width: 2;
          }
          :global(.node.active circle) {
            stroke: #fff;
            stroke-width: 2.5;
          }
          :global(.node.dim) {
            opacity: 0.15;
          }
          :global(.node text.label) {
            font-size: 10px;
            fill: rgba(255, 255, 255, 0.7);
            text-anchor: middle;
            pointer-events: none;
          }
          :global(.node:hover text.label, .node.active text.label) {
            fill: #fff;
            font-weight: 600;
          }
        `}</style>

        <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
          <button
            aria-label="Zoom in"
            onClick={() => {
              if (!svgRef.current || !stateRef.current.zoom) return;
              d3.select(svgRef.current).transition().duration(200).call(stateRef.current.zoom.scaleBy, 1.3);
            }}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/8 text-lg text-white backdrop-blur transition hover:scale-110 hover:bg-white/20"
          >
            +
          </button>
          <button
            aria-label="Zoom out"
            onClick={() => {
              if (!svgRef.current || !stateRef.current.zoom) return;
              d3.select(svgRef.current).transition().duration(200).call(stateRef.current.zoom.scaleBy, 1 / 1.3);
            }}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/8 text-lg text-white backdrop-blur transition hover:scale-110 hover:bg-white/20"
          >
            −
          </button>
          <button
            aria-label="Reset zoom"
            onClick={() => {
              if (!svgRef.current || !stateRef.current.zoom) return;
              d3.select(svgRef.current)
                .transition()
                .duration(300)
                .call(stateRef.current.zoom.transform, d3.zoomIdentity);
            }}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/8 text-lg text-white backdrop-blur transition hover:scale-110 hover:bg-white/20"
          >
            ⟲
          </button>
        </div>

        {status && (
          <div
            className="absolute left-1/2 top-6 z-20 max-w-[480px] -translate-x-1/2 rounded-lg border border-white/10 bg-[rgba(20,20,20,0.9)] px-4 py-2.5 text-center text-xs text-white/80 backdrop-blur"
            dangerouslySetInnerHTML={{ __html: status }}
          />
        )}
      </main>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-bone/35">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2.5 text-[13px] text-bone/85">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: "#fff" }}
      />
      <span>{label}</span>
    </label>
  );
}

function Radio({
  label,
  checked,
  onChange,
  name,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  name: string;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2.5 text-[13px] text-bone/85">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        style={{ accentColor: "#fff" }}
      />
      <span>{label}</span>
    </label>
  );
}

function Slider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-bone/55">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full"
        style={{ accentColor: "#fff" }}
      />
    </label>
  );
}
