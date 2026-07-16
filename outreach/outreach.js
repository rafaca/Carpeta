/*
 * Curbitas Outreach Tracker — a human-in-the-loop CRM.
 *
 * It reads targets.json (falls back to targets.sample.json), lets you filter,
 * tracks status/notes per target in localStorage, and helps you draft a
 * rule-appropriate message per channel from templates.md. It never posts or
 * sends anything — you review every draft and act through each channel yourself.
 */

const STORAGE_KEY = 'curbitas_outreach_v1';
const STATUSES = ['not_started', 'researching', 'contacted', 'posted', 'live', 'declined', 'do_not_contact'];

let targets = [];
let templates = {};
let progress = loadProgress();

const el = (sel) => document.querySelector(sel);

/* ---------- persistence ---------- */
function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
}
function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}
function stateOf(t) {
    return progress[t.id] || { status: t.status || 'not_started', note: t.next_step || '' };
}
function setState(id, patch) {
    progress[id] = Object.assign({}, progress[id], patch);
    saveProgress();
    renderStats();
}

/* ---------- data load ---------- */
async function loadData() {
    let data;
    try {
        const r = await fetch('targets.json', { cache: 'no-store' });
        data = r.ok ? await r.json() : await (await fetch('targets.sample.json')).json();
    } catch {
        data = await (await fetch('targets.sample.json')).json();
    }
    targets = data.targets || [];

    // Parse templates.md into { key: body }
    try {
        const md = await (await fetch('templates.md')).text();
        templates = parseTemplates(md);
    } catch { templates = {}; }
}

function parseTemplates(md) {
    const out = {};
    const re = /^##\s+(\w+)\s*$/gm;
    let m, last = null, lastIdx = 0;
    const marks = [];
    while ((m = re.exec(md)) !== null) marks.push({ key: m[1], start: m.index, bodyStart: re.lastIndex });
    marks.forEach((mk, i) => {
        const end = i + 1 < marks.length ? marks[i + 1].start : md.length;
        // strip leading blockquote guidance lines (> ...) from the body
        const body = md.slice(mk.bodyStart, end)
            .split('\n')
            .filter(line => !line.trim().startsWith('>'))
            .join('\n')
            .replace(/^\s*---\s*$/gm, '')
            .trim();
        out[mk.key] = body;
    });
    return out;
}

/* ---------- rendering ---------- */
function humanize(s) { return (s || '').replace(/_/g, ' '); }

function renderFilters() {
    const types = [...new Set(targets.map(t => t.type))].sort();
    const boroughs = [...new Set(targets.map(t => t.borough))].sort();
    fill(el('#filter-type'), types);
    fill(el('#filter-borough'), boroughs);
    fill(el('#filter-status'), STATUSES);
    function fill(sel, vals) {
        vals.forEach(v => {
            const o = document.createElement('option');
            o.value = v; o.textContent = humanize(v);
            sel.appendChild(o);
        });
    }
}

function currentFilter() {
    return {
        q: el('#search').value.trim().toLowerCase(),
        type: el('#filter-type').value,
        borough: el('#filter-borough').value,
        status: el('#filter-status').value,
    };
}

function matches(t, f) {
    if (f.type && t.type !== f.type) return false;
    if (f.borough && t.borough !== f.borough) return false;
    if (f.status && stateOf(t).status !== f.status) return false;
    if (f.q) {
        const hay = [t.name, t.neighborhood, t.fit_notes, t.approach, stateOf(t).note].join(' ').toLowerCase();
        if (!hay.includes(f.q)) return false;
    }
    return true;
}

function renderList() {
    const f = currentFilter();
    const list = el('#list');
    list.innerHTML = '';
    const shown = targets.filter(t => matches(t, f));
    if (!shown.length) {
        list.innerHTML = '<p style="grid-column:1/-1;color:var(--muted)">No targets match.</p>';
        return;
    }
    shown.forEach(t => list.appendChild(card(t)));
}

function card(t) {
    const st = stateOf(t);
    const c = document.createElement('article');
    c.className = 'oh-card';

    const nameLink = t.url ? `<a href="${t.url}" target="_blank" rel="noopener">${t.name}</a>` : t.name;
    const geo = [t.neighborhood, t.borough].filter(Boolean).map(humanize).join(' · ');

    c.innerHTML = `
        <div class="oh-card__top">
            <h3 class="oh-card__name">${nameLink}</h3>
            <span class="oh-chip oh-chip--${t.promo_policy}">${humanize(t.promo_policy)}</span>
        </div>
        <div class="oh-card__meta">${humanize(t.type)}${geo ? ' — ' + geo : ''}${t.audience ? ' · ' + t.audience : ''}</div>
        ${t.fit_notes ? `<p class="oh-card__notes">${t.fit_notes}</p>` : ''}
        ${t.approach ? `<p class="oh-card__approach"><strong>How:</strong> ${t.approach}</p>` : ''}
        <div class="oh-card__foot"></div>
    `;

    const foot = c.querySelector('.oh-card__foot');

    const sel = document.createElement('select');
    STATUSES.forEach(s => {
        const o = document.createElement('option');
        o.value = s; o.textContent = humanize(s);
        if (s === st.status) o.selected = true;
        sel.appendChild(o);
    });
    sel.addEventListener('change', () => { setState(t.id, { status: sel.value }); renderList(); });
    foot.appendChild(sel);

    if (t.template && t.template !== 'none' && templates[t.template]) {
        const draftBtn = document.createElement('button');
        draftBtn.className = 'oh-btn';
        draftBtn.textContent = 'Draft';
        draftBtn.addEventListener('click', () => openDraft(t));
        foot.appendChild(draftBtn);
    } else if (t.promo_policy === 'no_promo') {
        const badge = document.createElement('span');
        badge.className = 'oh-card__approach';
        badge.style.color = 'var(--warn)';
        badge.textContent = 'No promo — engage authentically';
        foot.appendChild(badge);
    }

    return c;
}

function renderStats() {
    const counts = {};
    targets.forEach(t => { const s = stateOf(t).status; counts[s] = (counts[s] || 0) + 1; });
    const active = (counts.contacted || 0) + (counts.posted || 0) + (counts.live || 0);
    const stats = [
        ['Targets', targets.length],
        ['In motion', active],
        ['Live', counts.live || 0],
    ];
    el('#stats').innerHTML = stats.map(([label, n]) =>
        `<span class="oh-stat"><span class="oh-stat__num">${n}</span><span class="oh-stat__label">${label}</span></span>`
    ).join('');
}

/* ---------- draft modal ---------- */
function openDraft(t) {
    const body = (templates[t.template] || '')
        .replaceAll('{{name}}', t.name)
        .replaceAll('{{neighborhood}}', t.neighborhood || t.borough || 'your neighborhood')
        .replaceAll('{{your_name}}', 'Rafa')
        .replaceAll('{{hook}}', t.fit_notes || 'what you do');

    el('#modal-title').textContent = 'Draft for ' + t.name;
    el('#modal-approach').textContent = t.approach || '';
    el('#modal-draft').value = body;
    const open = el('#modal-open');
    if (t.url) { open.href = t.url; open.style.display = ''; } else { open.style.display = 'none'; }
    el('#modal').hidden = false;
}

function wireModal() {
    el('#modal-close').addEventListener('click', () => el('#modal').hidden = true);
    el('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') el('#modal').hidden = true; });
    el('#modal-copy').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(el('#modal-draft').value); el('#modal-copy').textContent = 'Copied ✓'; setTimeout(() => el('#modal-copy').textContent = 'Copy draft', 1500); }
        catch { el('#modal-draft').select(); }
    });
}

/* ---------- import / export ---------- */
function wirePorting() {
    el('#export').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'curbitas-outreach-progress.json';
        a.click();
    });
    el('#import').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try { progress = JSON.parse(reader.result); saveProgress(); renderList(); renderStats(); }
            catch { alert('Could not read that file.'); }
        };
        reader.readAsText(file);
    });
}

function renderEthicsNote() {
    el('#ethics-note').innerHTML =
        'This tool is deliberately manual. Facebook, Reddit, Nextdoor and Craigslist ban automated posting, ' +
        'and Buy Nothing groups ban promotion entirely. <strong>Never drop your link in a no-promo space.</strong> ' +
        'The wins here come from showing up as a real, useful neighbor and pitching the channels that actually invite pitches.';
}

/* ---------- init ---------- */
async function init() {
    await loadData();
    renderFilters();
    renderStats();
    renderList();
    renderEthicsNote();
    wireModal();
    wirePorting();
    ['#search', '#filter-type', '#filter-borough', '#filter-status'].forEach(sel => {
        el(sel).addEventListener('input', renderList);
    });
}

init();
