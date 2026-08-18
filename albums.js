/**
 * Album Cover Archive
 * Loads albums.json (falling back to albums.sample.json), groups albums by
 * year, renders a full-width grid of 100×100 covers, and color-codes every
 * album by genre with a clickable legend filter.
 */

(function () {
    'use strict';

    // Fixed palette for common genres; anything else gets a stable hashed hue.
    const GENRE_COLORS = {
        'Rock': '#fc3b2c',
        'Pop': '#ff7ab6',
        'Hip-Hop': '#ffb020',
        'Jazz': '#3f8efc',
        'Electronic': '#2bd9c7',
        'Soul': '#a06cff',
        'Funk': '#c5e04b',
        'Folk': '#d9a066',
        'Classical': '#e8e6df',
        'Reggae': '#31b057',
        'Latin': '#ff5c39',
        'Ambient': '#7fa8a1',
        'Punk': '#f2e600',
        'Metal': '#8c8c99'
    };
    const UNKNOWN_GENRE = 'Uncategorized';

    const yearsEl = document.getElementById('years');
    const legendEl = document.getElementById('legend');
    const countEl = document.getElementById('album-count');
    const emptyEl = document.getElementById('empty-state');
    const sortBtn = document.getElementById('sort-toggle');

    let albums = [];
    let newestFirst = true;
    let activeGenre = null;

    init();

    async function init() {
        albums = await loadAlbums();
        if (!albums.length) {
            emptyEl.classList.remove('hidden');
            return;
        }
        countEl.textContent = albums.length + ' albums';
        renderLegend();
        renderYears();

        sortBtn.addEventListener('click', () => {
            newestFirst = !newestFirst;
            sortBtn.textContent = newestFirst ? 'Newest first' : 'Oldest first';
            sortBtn.setAttribute('aria-pressed', String(!newestFirst));
            renderYears();
        });
    }

    async function loadAlbums() {
        for (const src of ['albums.json', 'albums.sample.json']) {
            try {
                const res = await fetch(src);
                if (!res.ok) continue;
                const data = await res.json();
                if (Array.isArray(data.albums)) return data.albums.map(normalize);
            } catch (e) { /* try next source */ }
        }
        return [];
    }

    function normalize(a) {
        return {
            title: a.title || 'Untitled',
            artist: a.artist || 'Unknown artist',
            year: Number.isFinite(+a.year) && +a.year > 0 ? +a.year : null,
            genre: (a.genre || UNKNOWN_GENRE).trim() || UNKNOWN_GENRE,
            cover: a.cover || null
        };
    }

    function genreColor(genre) {
        if (GENRE_COLORS[genre]) return GENRE_COLORS[genre];
        // Stable hue from the genre string so unlisted genres keep their color.
        let hash = 0;
        for (let i = 0; i < genre.length; i++) {
            hash = (hash * 31 + genre.charCodeAt(i)) >>> 0;
        }
        return `hsl(${hash % 360}, 62%, 58%)`;
    }

    function renderLegend() {
        const counts = new Map();
        for (const a of albums) counts.set(a.genre, (counts.get(a.genre) || 0) + 1);
        const genres = [...counts.keys()].sort((x, y) => counts.get(y) - counts.get(x));

        legendEl.innerHTML = '';
        legendEl.appendChild(chip('All', albums.length, null));
        for (const g of genres) legendEl.appendChild(chip(g, counts.get(g), genreColor(g)));
        syncChips();
    }

    function chip(label, count, color) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'legend__chip';
        btn.dataset.genre = color === null ? '' : label;
        if (color) btn.style.setProperty('--chip-color', color);

        const swatch = document.createElement('span');
        swatch.className = 'legend__swatch';
        if (!color) swatch.style.background = 'linear-gradient(135deg, #fc3b2c, #3f8efc)';
        btn.appendChild(swatch);
        btn.appendChild(document.createTextNode(label + ' '));

        const n = document.createElement('span');
        n.className = 'legend__count';
        n.textContent = count;
        btn.appendChild(n);

        btn.addEventListener('click', () => {
            const genre = btn.dataset.genre || null;
            activeGenre = (genre === activeGenre) ? null : genre;
            syncChips();
            applyFilter();
        });
        return btn;
    }

    function syncChips() {
        for (const c of legendEl.children) {
            const genre = c.dataset.genre || null;
            c.setAttribute('aria-pressed', String(genre === activeGenre || (genre === null && activeGenre === null)));
        }
    }

    function applyFilter() {
        for (const tile of yearsEl.querySelectorAll('.album')) {
            tile.classList.toggle('is-filtered-out', !!activeGenre && tile.dataset.genre !== activeGenre);
        }
        for (const section of yearsEl.querySelectorAll('.year-section')) {
            const visible = section.querySelectorAll('.album:not(.is-filtered-out)').length;
            section.classList.toggle('is-empty', visible === 0);
            section.querySelector('.year-heading__count').textContent =
                visible + (visible === 1 ? ' album' : ' albums');
        }
    }

    function renderYears() {
        const byYear = new Map();
        for (const a of albums) {
            const key = a.year === null ? 'Unknown' : a.year;
            if (!byYear.has(key)) byYear.set(key, []);
            byYear.get(key).push(a);
        }

        const years = [...byYear.keys()].sort((x, y) => {
            if (x === 'Unknown') return 1;
            if (y === 'Unknown') return -1;
            return newestFirst ? y - x : x - y;
        });

        yearsEl.innerHTML = '';
        for (const year of years) {
            const list = byYear.get(year);
            list.sort((x, y) => x.artist.localeCompare(y.artist) || x.title.localeCompare(y.title));

            const section = document.createElement('section');
            section.className = 'year-section';

            const heading = document.createElement('h2');
            heading.className = 'year-heading';
            heading.innerHTML =
                '<span class="year-heading__year"></span>' +
                '<span class="year-heading__count"></span>';
            heading.querySelector('.year-heading__year').textContent = year;
            heading.querySelector('.year-heading__count').textContent =
                list.length + (list.length === 1 ? ' album' : ' albums');
            section.appendChild(heading);

            const grid = document.createElement('div');
            grid.className = 'album-grid';
            for (const album of list) grid.appendChild(tile(album));
            section.appendChild(grid);

            yearsEl.appendChild(section);
        }
        applyFilter();
    }

    function tile(album) {
        const fig = document.createElement('figure');
        fig.className = 'album';
        fig.tabIndex = 0;
        fig.dataset.genre = album.genre;
        fig.style.setProperty('--album-color', genreColor(album.genre));

        const label = `${album.title} — ${album.artist}` + (album.year ? ` (${album.year})` : '');
        fig.title = label;

        if (album.cover) {
            const img = document.createElement('img');
            img.src = album.cover;
            img.alt = label;
            img.loading = 'lazy';
            img.decoding = 'async';
            img.width = 200;
            img.height = 200;
            img.addEventListener('error', () => img.replaceWith(placeholder(album)), { once: true });
            fig.appendChild(img);
        } else {
            fig.appendChild(placeholder(album));
        }

        const info = document.createElement('figcaption');
        info.className = 'album__info';
        const t = document.createElement('div');
        t.className = 'album__title';
        t.textContent = album.title;
        const ar = document.createElement('div');
        ar.className = 'album__artist';
        ar.textContent = album.artist;
        info.appendChild(t);
        info.appendChild(ar);
        fig.appendChild(info);

        return fig;
    }

    // Generated cover for albums with no image: initials over a two-tone
    // gradient derived from the title, tinted toward the genre color.
    function placeholder(album) {
        let hash = 0;
        const seed = album.title + album.artist;
        for (let i = 0; i < seed.length; i++) hash = (hash * 33 + seed.charCodeAt(i)) >>> 0;
        const h1 = hash % 360;
        const h2 = (h1 + 40) % 360;

        const initials = album.title
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(w => w[0].toUpperCase())
            .join('');

        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', album.title);

        const gradId = 'g' + hash.toString(36);
        const defs = document.createElementNS(ns, 'defs');
        const grad = document.createElementNS(ns, 'linearGradient');
        grad.setAttribute('id', gradId);
        grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0');
        grad.setAttribute('x2', '1'); grad.setAttribute('y2', '1');
        const s1 = document.createElementNS(ns, 'stop');
        s1.setAttribute('offset', '0');
        s1.setAttribute('stop-color', `hsl(${h1}, 38%, 26%)`);
        const s2 = document.createElementNS(ns, 'stop');
        s2.setAttribute('offset', '1');
        s2.setAttribute('stop-color', `hsl(${h2}, 42%, 14%)`);
        grad.appendChild(s1);
        grad.appendChild(s2);
        defs.appendChild(grad);
        svg.appendChild(defs);

        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('width', '100');
        rect.setAttribute('height', '100');
        rect.setAttribute('fill', `url(#${gradId})`);
        svg.appendChild(rect);

        const text = document.createElementNS(ns, 'text');
        text.setAttribute('x', '50');
        text.setAttribute('y', '50');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('fill', 'rgba(255,255,255,0.85)');
        text.setAttribute('font-family', 'Inter, sans-serif');
        text.setAttribute('font-size', '30');
        text.setAttribute('font-weight', '700');
        text.textContent = initials || '♪';
        svg.appendChild(text);

        return svg;
    }
})();
