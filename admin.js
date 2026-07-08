/**
 * Admin upload mode.
 *
 * Activate by visiting the site with ?admin=1 (the flag is remembered in
 * localStorage on this device). When active, drag any image onto the page
 * and it will:
 *   1. be committed to photos/<id>.<ext> in this repo via the GitHub API,
 *   2. appended to photos.json,
 *   3. placed onto the live canvas immediately so you see it right away.
 *
 * The first commit prompts for a GitHub Personal Access Token. Token is
 * stored in localStorage on this device only; never sent anywhere except
 * api.github.com.
 *
 * Required token scope:
 *   - Classic PAT: `repo`
 *   - Fine-grained PAT: Contents: read/write on rafaca/Carpeta
 */

(() => {
    const REPO_OWNER = 'rafaca';
    const REPO_NAME = 'Carpeta';
    const PHOTOS_DIR = 'photos';
    const MANIFEST_PATH = 'photos.json';
    const TOKEN_KEY = 'carpeta_gh_token';
    const ADMIN_KEY = 'carpeta_admin_mode';
    const API = 'https://api.github.com';

    const params = new URLSearchParams(location.search);
    if (params.get('admin') === '1') {
        localStorage.setItem(ADMIN_KEY, '1');
    } else if (params.get('admin') === '0') {
        localStorage.removeItem(ADMIN_KEY);
        localStorage.removeItem(TOKEN_KEY);
    }

    const adminEnabled = localStorage.getItem(ADMIN_KEY) === '1';
    if (!adminEnabled) return;

    const panel = document.getElementById('admin-panel');
    const statusEl = document.getElementById('admin-status');
    const signOut = document.getElementById('admin-signout');
    const dropzone = document.getElementById('admin-dropzone');

    panel.classList.remove('hidden');
    panel.setAttribute('aria-hidden', 'false');

    signOut.addEventListener('click', () => {
        localStorage.removeItem(ADMIN_KEY);
        localStorage.removeItem(TOKEN_KEY);
        location.search = '';
    });

    function setStatus(text, kind) {
        statusEl.textContent = text;
        panel.classList.remove('is-busy', 'is-error');
        if (kind === 'busy') panel.classList.add('is-busy');
        if (kind === 'error') panel.classList.add('is-error');
    }

    function getToken() {
        let token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            token = prompt(
                'Paste a GitHub Personal Access Token with Contents:write on ' +
                REPO_OWNER + '/' + REPO_NAME + '.\n\n' +
                'Stored only in this browser.'
            );
            if (token) {
                token = token.trim();
                localStorage.setItem(TOKEN_KEY, token);
            }
        }
        return token;
    }

    async function gh(path, opts = {}) {
        const token = getToken();
        if (!token) throw new Error('No token');
        const res = await fetch(API + path, {
            ...opts,
            headers: {
                'Accept': 'application/vnd.github+json',
                'Authorization': `Bearer ${token}`,
                'X-GitHub-Api-Version': '2022-11-28',
                ...(opts.headers || {}),
            },
        });
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem(TOKEN_KEY);
            throw new Error(`GitHub auth failed (${res.status}). Token cleared — try again.`);
        }
        return res;
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // strip the data:...;base64, prefix
                const result = reader.result;
                const comma = result.indexOf(',');
                resolve(comma >= 0 ? result.slice(comma + 1) : result);
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    function readImageDimensions(file) {
        return new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve({ width: 0, height: 0 });
            };
            img.src = url;
        });
    }

    function shortId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function safeExt(name) {
        const m = /\.([a-zA-Z0-9]+)$/.exec(name || '');
        const ext = (m ? m[1] : 'jpg').toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif'].includes(ext) ? ext : 'jpg';
    }

    async function getManifest() {
        const res = await gh(
            `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${MANIFEST_PATH}`
        );
        if (res.status === 404) {
            return { sha: null, data: { source: 'admin-upload', count: 0, photos: [] } };
        }
        if (!res.ok) throw new Error(`Could not read ${MANIFEST_PATH} (${res.status})`);
        const json = await res.json();
        const decoded = decodeURIComponent(escape(atob(json.content.replace(/\n/g, ''))));
        let data;
        try {
            data = JSON.parse(decoded);
        } catch {
            data = { source: 'admin-upload', count: 0, photos: [] };
        }
        if (!Array.isArray(data.photos)) data.photos = [];
        return { sha: json.sha, data };
    }

    function utf8ToBase64(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }

    async function putFile(path, base64Content, message, sha) {
        const body = { message, content: base64Content };
        if (sha) body.sha = sha;
        const res = await gh(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Upload failed: ${res.status} ${err}`);
        }
        return res.json();
    }

    async function uploadOne(file) {
        if (!file.type.startsWith('image/')) {
            throw new Error(`${file.name}: not an image`);
        }

        const ext = safeExt(file.name);
        const id = shortId();
        const filename = `${id}.${ext}`;
        const repoPath = `${PHOTOS_DIR}/${filename}`;

        setStatus(`Reading ${file.name}…`, 'busy');
        const [base64, dims] = await Promise.all([
            fileToBase64(file),
            readImageDimensions(file),
        ]);

        setStatus(`Uploading ${file.name}…`, 'busy');
        await putFile(repoPath, base64, `admin: add ${filename}`);

        setStatus(`Updating manifest…`, 'busy');
        const { sha, data } = await getManifest();
        const photo = {
            id,
            src: `${PHOTOS_DIR}/${filename}`,
            original: file.name,
            width: dims.width || undefined,
            height: dims.height || undefined,
            addedAt: new Date().toISOString(),
        };
        data.photos.push(photo);
        data.count = data.photos.length;
        const manifestB64 = utf8ToBase64(JSON.stringify(data, null, 2) + '\n');
        await putFile(MANIFEST_PATH, manifestB64, `admin: append ${filename} to manifest`, sha);

        return photo;
    }

    function placeOnCanvas(file, photo) {
        const canvas = window.infiniteCanvas;
        if (!canvas) return;

        // Add to the in-memory pool so future chunk loads can pick it up.
        if (Array.isArray(canvas.photos)) canvas.photos.push(photo);

        // Place a one-off element near the current viewport center so the
        // user gets immediate visual feedback without waiting for the next
        // deploy / reload.
        const rect = canvas.container.getBoundingClientRect();
        const centerCanvasX = (rect.width / 2 - canvas.translateX) / canvas.scale;
        const centerCanvasY = (rect.height / 2 - canvas.translateY) / canvas.scale;

        const targetW = 320;
        const ratio = photo.width && photo.height ? photo.height / photo.width : 0.66;
        const targetH = Math.round(targetW * ratio);

        const el = document.createElement('div');
        el.className = 'photo-item photo-item--pinned';
        el.style.left = `${Math.round(centerCanvasX - targetW / 2)}px`;
        el.style.top = `${Math.round(centerCanvasY - targetH / 2)}px`;
        el.style.width = `${targetW}px`;
        el.style.height = `${targetH}px`;

        const img = document.createElement('img');
        img.alt = photo.id;
        img.classList.add('loaded');
        img.src = URL.createObjectURL(file);
        el.appendChild(img);
        canvas.canvas.appendChild(el);
    }

    async function handleFiles(fileList) {
        const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) {
            setStatus('No images in drop', 'error');
            setTimeout(() => setStatus('Drop an image anywhere to publish'), 2500);
            return;
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const photo = await uploadOne(file);
                placeOnCanvas(file, photo);
                setStatus(`Published ${file.name} (${i + 1}/${files.length})`);
            } catch (err) {
                console.error(err);
                setStatus(err.message || 'Upload failed', 'error');
                return;
            }
        }
        setTimeout(() => setStatus('Drop an image anywhere to publish'), 3000);
    }

    // Drag overlay management. We count enter/leave so child elements
    // don't flicker the overlay off.
    let dragDepth = 0;
    function dragHasFiles(e) {
        if (!e.dataTransfer) return false;
        const types = e.dataTransfer.types;
        return types && Array.from(types).includes('Files');
    }

    window.addEventListener('dragenter', (e) => {
        if (!dragHasFiles(e)) return;
        e.preventDefault();
        dragDepth++;
        dropzone.classList.remove('hidden');
        requestAnimationFrame(() => dropzone.classList.add('is-active'));
    });

    window.addEventListener('dragover', (e) => {
        if (!dragHasFiles(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    window.addEventListener('dragleave', (e) => {
        if (!dragHasFiles(e)) return;
        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0) {
            dropzone.classList.remove('is-active');
            dropzone.classList.add('hidden');
        }
    });

    window.addEventListener('drop', (e) => {
        if (!dragHasFiles(e)) return;
        e.preventDefault();
        dragDepth = 0;
        dropzone.classList.remove('is-active');
        dropzone.classList.add('hidden');
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });
})();
