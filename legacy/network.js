/**
 * Creator Network
 * Force-directed graph of Instagram creators and the relationships
 * between them. Inspired by MoMA's "Inventing Abstraction" diagram.
 *
 * Data flow:
 *   creators.json (or creators.sample.json)
 *       -> state.creators
 *       -> derived nodes/links
 *       -> D3 force simulation
 *       -> SVG rendering
 *
 * Each edge carries a `types` array describing which relationships
 * (category / follow / collab) contributed to it, and a `weight` that
 * drives link thickness and force strength.
 */

const EDGE_WEIGHTS = {
    category: 1,
    follow: 2,
    collab: 3,
};

const state = {
    creators: [],
    nodes: [],
    links: [],
    activeEdgeTypes: new Set(['category', 'follow', 'collab']),
    sizeMode: 'connections',
    selectedId: null,
    searchTerm: '',
    categoriesAll: [],
    colorScale: null,
};

const svg = d3.select('#graph');
const container = document.getElementById('graph-container');

const rootGroup = svg.append('g');
const linkGroup = rootGroup.append('g').attr('class', 'links');
const nodeGroup = rootGroup.append('g').attr('class', 'nodes');

const zoom = d3.zoom()
    .scaleExtent([0.1, 8])
    .on('zoom', (event) => rootGroup.attr('transform', event.transform));
svg.call(zoom);

let simulation;

async function init() {
    const { creators, source } = await loadCreators();
    state.creators = creators;
    state.nodes = creators.map(c => ({ ...c }));

    state.categoriesAll = uniqueCategories();
    state.colorScale = d3.scaleOrdinal()
        .domain(state.categoriesAll)
        .range(d3.schemeTableau10.concat(d3.schemeSet3));

    if (state.nodes.length === 0) {
        showStatus('No creator data found. Drop a <code>creators.json</code> file into the project root. See <code>creators.sample.json</code> for the expected schema.');
        return;
    }

    if (source === 'creators.sample.json') {
        showStatus('Showing sample data from <code>creators.sample.json</code>. Export your Notion database and save it as <code>creators.json</code> to see your own creators.');
    }

    setupControls();
    renderLegend();
    rebuildLinks();
    initSimulation();
    window.addEventListener('resize', onResize);
}

async function loadCreators() {
    for (const source of ['creators.json', 'creators.sample.json']) {
        try {
            const res = await fetch(source);
            if (res.ok) {
                const data = await res.json();
                return { creators: data.creators || [], source };
            }
        } catch (_) {
            // Ignore and try the next source
        }
    }
    return { creators: [], source: null };
}

function uniqueCategories() {
    const cats = new Set();
    for (const c of state.creators) {
        (c.categories || []).forEach(x => cats.add(x));
    }
    return [...cats].sort();
}

function primaryCategory(d) {
    return (d.categories || [])[0] || 'other';
}

function nodeColor(d) {
    if (!state.colorScale) return '#888';
    return state.colorScale(primaryCategory(d));
}

function rebuildLinks() {
    const links = [];
    const { nodes, activeEdgeTypes } = state;

    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            const types = new Set();
            let weight = 0;

            if (activeEdgeTypes.has('category')) {
                const aCats = new Set(a.categories || []);
                const shared = (b.categories || []).filter(c => aCats.has(c));
                if (shared.length > 0) {
                    types.add('category');
                    weight += shared.length * EDGE_WEIGHTS.category;
                }
            }

            if (activeEdgeTypes.has('follow')) {
                const aFollowsB = (a.follows || []).includes(b.id);
                const bFollowsA = (b.follows || []).includes(a.id);
                if (aFollowsB && bFollowsA) {
                    types.add('follow');
                    weight += 2 * EDGE_WEIGHTS.follow;
                } else if (aFollowsB || bFollowsA) {
                    types.add('follow');
                    weight += EDGE_WEIGHTS.follow;
                }
            }

            if (activeEdgeTypes.has('collab')) {
                const aCollab = (a.collaborations || []).includes(b.id);
                const bCollab = (b.collaborations || []).includes(a.id);
                if (aCollab || bCollab) {
                    types.add('collab');
                    weight += EDGE_WEIGHTS.collab;
                }
            }

            if (weight > 0) {
                links.push({
                    source: a.id,
                    target: b.id,
                    weight,
                    types: [...types],
                });
            }
        }
    }

    state.links = links;

    // Recompute degree (total weight) for each node.
    const degree = new Map();
    for (const l of links) {
        degree.set(l.source, (degree.get(l.source) || 0) + l.weight);
        degree.set(l.target, (degree.get(l.target) || 0) + l.weight);
    }
    for (const n of state.nodes) {
        n.degree = degree.get(n.id) || 0;
    }
}

function nodeRadius(d) {
    const base = 8;
    if (state.sizeMode === 'connections') {
        return base + Math.sqrt(d.degree || 0) * 2.2;
    }
    if (state.sizeMode === 'followers') {
        const f = d.followers || 0;
        return base + Math.sqrt(f) / 10;
    }
    return base + 4;
}

function initSimulation() {
    const rect = container.getBoundingClientRect();
    svg.attr('width', rect.width).attr('height', rect.height);

    simulation = d3.forceSimulation(state.nodes)
        .force('link', d3.forceLink(state.links)
            .id(d => d.id)
            .distance(getLinkDistance())
            .strength(l => Math.min(1, l.weight / 6)))
        .force('charge', d3.forceManyBody().strength(getChargeStrength()))
        .force('center', d3.forceCenter(rect.width / 2, rect.height / 2))
        .force('collide', d3.forceCollide().radius(d => nodeRadius(d) + 3))
        .on('tick', ticked);

    render();
}

function onResize() {
    if (!simulation) return;
    const rect = container.getBoundingClientRect();
    svg.attr('width', rect.width).attr('height', rect.height);
    simulation.force('center', d3.forceCenter(rect.width / 2, rect.height / 2));
    simulation.alpha(0.3).restart();
}

function render() {
    // Links
    linkGroup.selectAll('line')
        .data(state.links, d => `${linkEndId(d.source)}|${linkEndId(d.target)}`)
        .join(
            enter => enter.append('line')
                .attr('class', d => `link ${d.types.map(t => `type-${t}`).join(' ')}`)
                .attr('stroke-width', d => Math.max(1, Math.sqrt(d.weight))),
            update => update
                .attr('class', d => `link ${d.types.map(t => `type-${t}`).join(' ')}`)
                .attr('stroke-width', d => Math.max(1, Math.sqrt(d.weight))),
            exit => exit.remove()
        );

    // Nodes
    const nodeSel = nodeGroup.selectAll('g.node')
        .data(state.nodes, d => d.id)
        .join(
            enter => {
                const g = enter.append('g')
                    .attr('class', 'node')
                    .call(drag(simulation))
                    .on('click', (event, d) => { event.stopPropagation(); selectNode(d); })
                    .on('mouseenter', (event, d) => { if (!state.selectedId) showDetails(d); })
                    .on('mouseleave', () => { if (!state.selectedId) showDetails(null); });
                g.append('circle');
                g.append('text').attr('class', 'label');
                return g;
            },
            update => update,
            exit => exit.remove()
        );

    nodeSel.select('circle')
        .attr('r', nodeRadius)
        .attr('fill', nodeColor);

    nodeSel.select('text.label')
        .attr('dy', d => -(nodeRadius(d) + 4))
        .text(d => d.name);

    applyHighlight();
}

function linkEndId(end) {
    return typeof end === 'object' ? end.id : end;
}

function ticked() {
    linkGroup.selectAll('line')
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

    nodeGroup.selectAll('g.node')
        .attr('transform', d => `translate(${d.x},${d.y})`);
}

function drag(sim) {
    return d3.drag()
        .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        })
        .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
        })
        .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        });
}

function selectNode(d) {
    state.selectedId = state.selectedId === d.id ? null : d.id;
    showDetails(state.selectedId ? d : null);
    applyHighlight();
}

function applyHighlight() {
    const sel = state.selectedId;
    const term = state.searchTerm.trim().toLowerCase();

    const matched = new Set();
    if (sel) matched.add(sel);
    if (term) {
        for (const n of state.nodes) {
            if (n.name.toLowerCase().includes(term) ||
                (n.handle || '').toLowerCase().includes(term) ||
                (n.categories || []).some(c => c.toLowerCase().includes(term))) {
                matched.add(n.id);
            }
        }
    }

    const highlightActive = matched.size > 0;
    const neighbors = new Set(matched);

    if (highlightActive) {
        for (const l of state.links) {
            const sId = linkEndId(l.source);
            const tId = linkEndId(l.target);
            if (matched.has(sId)) neighbors.add(tId);
            if (matched.has(tId)) neighbors.add(sId);
        }
    }

    nodeGroup.selectAll('g.node')
        .classed('dim', d => highlightActive && !neighbors.has(d.id))
        .classed('active', d => matched.has(d.id));

    linkGroup.selectAll('line')
        .classed('dim', d => {
            if (!highlightActive) return false;
            const sId = linkEndId(d.source);
            const tId = linkEndId(d.target);
            return !(matched.has(sId) && matched.has(tId)) &&
                   !(matched.has(sId) || matched.has(tId));
        });
}

function showDetails(d) {
    const el = document.getElementById('details');
    if (!d) {
        el.className = 'details-empty';
        el.innerHTML = 'Hover or click a node to see details.';
        return;
    }
    el.className = '';
    const cats = (d.categories || [])
        .map(c => `<span class="chip">${escapeHtml(c)}</span>`)
        .join('');
    const followers = d.followers
        ? `<p><strong>${d.followers.toLocaleString()}</strong> followers</p>`
        : '';
    const bio = d.bio ? `<p class="bio">${escapeHtml(d.bio)}</p>` : '';
    const handle = d.handle
        ? `<p><a href="https://instagram.com/${encodeURIComponent(d.handle)}" target="_blank" rel="noopener">@${escapeHtml(d.handle)}</a></p>`
        : '';
    const degree = `<p>${d.degree || 0} weighted connection${d.degree === 1 ? '' : 's'}</p>`;
    el.innerHTML = `
        <h3>${escapeHtml(d.name)}</h3>
        ${handle}
        ${followers}
        ${degree}
        <div class="chips">${cats}</div>
        ${bio}
    `;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderLegend() {
    const el = document.getElementById('legend');
    if (!el) return;
    el.innerHTML = '';
    for (const cat of state.categoriesAll) {
        const item = document.createElement('span');
        item.className = 'legend-item';
        const swatch = document.createElement('span');
        swatch.className = 'legend-swatch';
        swatch.style.background = state.colorScale(cat);
        item.appendChild(swatch);
        item.appendChild(document.createTextNode(cat));
        el.appendChild(item);
    }
}

function getLinkDistance() {
    return +document.getElementById('linkDistance').value;
}

function getChargeStrength() {
    return +document.getElementById('chargeStrength').value;
}

function reheat(alpha = 0.5) {
    if (simulation) simulation.alpha(alpha).restart();
}

function setupControls() {
    document.querySelectorAll('input[data-edge]').forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) state.activeEdgeTypes.add(cb.dataset.edge);
            else state.activeEdgeTypes.delete(cb.dataset.edge);
            rebuildLinks();
            simulation.nodes(state.nodes);
            simulation.force('link').links(state.links);
            render();
            reheat(0.8);
        });
    });

    document.querySelectorAll('input[name="size"]').forEach(rb => {
        rb.addEventListener('change', () => {
            state.sizeMode = rb.value;
            render();
            simulation.force('collide',
                d3.forceCollide().radius(d => nodeRadius(d) + 3));
            reheat(0.4);
        });
    });

    document.getElementById('linkDistance').addEventListener('input', () => {
        simulation.force('link').distance(getLinkDistance());
        reheat(0.4);
    });

    document.getElementById('chargeStrength').addEventListener('input', () => {
        simulation.force('charge').strength(getChargeStrength());
        reheat(0.4);
    });

    document.getElementById('search').addEventListener('input', (e) => {
        state.searchTerm = e.target.value;
        applyHighlight();
    });

    // Click on empty svg area clears selection
    svg.on('click', () => {
        if (state.selectedId) {
            state.selectedId = null;
            showDetails(null);
            applyHighlight();
        }
    });

    // Zoom buttons
    document.getElementById('zoom-in').addEventListener('click',
        () => svg.transition().duration(200).call(zoom.scaleBy, 1.3));
    document.getElementById('zoom-out').addEventListener('click',
        () => svg.transition().duration(200).call(zoom.scaleBy, 1 / 1.3));
    document.getElementById('zoom-reset').addEventListener('click',
        () => svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity));
}

function showStatus(html) {
    const el = document.getElementById('graph-status');
    el.innerHTML = html;
    el.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', init);
