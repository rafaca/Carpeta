(() => {
  // ----- tab switching -----
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    panels.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById(t.dataset.tab).classList.add('active');
  }));

  // ----- copy buttons -----
  document.querySelectorAll('.copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      const code = document.getElementById(btn.dataset.target).textContent;
      try {
        await navigator.clipboard.writeText(code);
        btn.classList.add('copied');
        btn.textContent = 'Copied';
        setTimeout(() => { btn.classList.remove('copied'); btn.textContent = 'Copy'; }, 1500);
      } catch {
        btn.textContent = 'Copy failed';
      }
    });
  });

  // ----- snippet templates -----
  // Each template is a function (cfg) => string. Snippets are self-contained
  // IIFEs that the user pastes into the console of the relevant tab.

  const igUnfollow = (c) => `// === Instagram: unfollow everyone you follow ===
// Run on instagram.com while logged in. Stop early: window.STOP_BULK = true
(async () => {
  const MIN_DELAY = ${c.min}, MAX_DELAY = ${c.max}, CAP = ${c.cap};
  const APP_ID = '936619743392459';
  const ck = (k) => document.cookie.split('; ').find(r => r.startsWith(k+'='))?.split('=')[1];
  const csrf = ck('csrftoken');
  const me = ck('ds_user_id');
  if (!csrf || !me) { console.error('Not logged in to instagram.com'); return; }
  window.STOP_BULK = false;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const rand = (a,b) => Math.floor(a + Math.random() * (b - a));
  const headers = { 'x-ig-app-id': APP_ID, 'x-csrftoken': csrf, 'x-requested-with': 'XMLHttpRequest' };
  console.log('%cIG bulk unfollow — me=' + me + '. To abort: window.STOP_BULK = true', 'font-weight:bold;color:#c00');
  let count = 0, maxId = '', failures = 0;
  outer: while (count < CAP) {
    const url = '/api/v1/friendships/' + me + '/following/?count=50' + (maxId ? '&max_id=' + maxId : '');
    let page;
    try {
      const r = await fetch(url, { headers, credentials: 'include' });
      if (!r.ok) { console.error('list fetch failed', r.status); break; }
      page = await r.json();
    } catch (e) { console.error('list err', e); break; }
    if (!page.users || !page.users.length) { console.log('No more users.'); break; }
    for (const u of page.users) {
      if (window.STOP_BULK) { console.log('Aborted.'); break outer; }
      if (count >= CAP) break outer;
      try {
        const r = await fetch('/api/v1/friendships/destroy/' + u.pk + '/', {
          method: 'POST', headers, credentials: 'include',
          body: 'user_id=' + u.pk
        });
        if (r.status === 429 || r.status === 400) {
          console.warn('Throttled (' + r.status + '). Backing off 5min.');
          await sleep(5 * 60 * 1000); continue;
        }
        if (!r.ok) { failures++; console.warn('skip', u.username, r.status); }
        else { count++; console.log('(' + count + '/' + CAP + ') unfollowed @' + u.username); }
      } catch (e) { failures++; console.warn('err', u.username, e); }
      await sleep(rand(MIN_DELAY, MAX_DELAY));
    }
    if (!page.next_max_id) break;
    maxId = page.next_max_id;
  }
  console.log('%cDone. ' + count + ' unfollowed, ' + failures + ' failures.', 'font-weight:bold;color:#080');
})();`;

  const igRemove = (c) => `// === Instagram: remove all your followers ===
// Run on instagram.com while logged in. Stop early: window.STOP_BULK = true
(async () => {
  const MIN_DELAY = ${c.min}, MAX_DELAY = ${c.max}, CAP = ${c.cap};
  const APP_ID = '936619743392459';
  const ck = (k) => document.cookie.split('; ').find(r => r.startsWith(k+'='))?.split('=')[1];
  const csrf = ck('csrftoken');
  const me = ck('ds_user_id');
  if (!csrf || !me) { console.error('Not logged in to instagram.com'); return; }
  window.STOP_BULK = false;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const rand = (a,b) => Math.floor(a + Math.random() * (b - a));
  const headers = { 'x-ig-app-id': APP_ID, 'x-csrftoken': csrf, 'x-requested-with': 'XMLHttpRequest' };
  console.log('%cIG remove followers — me=' + me + '. Abort: window.STOP_BULK = true', 'font-weight:bold;color:#c00');
  let count = 0, maxId = '', failures = 0;
  outer: while (count < CAP) {
    const url = '/api/v1/friendships/' + me + '/followers/?count=50' + (maxId ? '&max_id=' + maxId : '');
    let page;
    try {
      const r = await fetch(url, { headers, credentials: 'include' });
      if (!r.ok) { console.error('list fetch failed', r.status); break; }
      page = await r.json();
    } catch (e) { console.error('list err', e); break; }
    if (!page.users || !page.users.length) { console.log('No more users.'); break; }
    for (const u of page.users) {
      if (window.STOP_BULK) { console.log('Aborted.'); break outer; }
      if (count >= CAP) break outer;
      try {
        const r = await fetch('/api/v1/friendships/remove_follower/' + u.pk + '/', {
          method: 'POST', headers, credentials: 'include'
        });
        if (r.status === 429 || r.status === 400) {
          console.warn('Throttled (' + r.status + '). Backing off 5min.');
          await sleep(5 * 60 * 1000); continue;
        }
        if (!r.ok) { failures++; console.warn('skip', u.username, r.status); }
        else { count++; console.log('(' + count + '/' + CAP + ') removed @' + u.username); }
      } catch (e) { failures++; console.warn('err', u.username, e); }
      await sleep(rand(MIN_DELAY, MAX_DELAY));
    }
    if (!page.next_max_id) break;
    maxId = page.next_max_id;
  }
  console.log('%cDone. ' + count + ' removed, ' + failures + ' failures.', 'font-weight:bold;color:#080');
})();`;

  const fbUnfriend = (c) => `// === Facebook: unfriend everyone ===
// Open facebook.com/friends/list, then run. Abort: window.STOP_BULK = true
// FB changes its DOM frequently. If nothing happens, inspect a "Friends"
// button and update the FRIEND_BTN selector.
(async () => {
  const MIN_DELAY = ${c.min}, MAX_DELAY = ${c.max}, CAP = ${c.cap};
  const FRIEND_BTN = 'div[aria-label="Friends"][role="button"]';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const rand = (a,b) => Math.floor(a + Math.random() * (b - a));
  const waitFor = async (fn, timeout = 4000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const v = fn(); if (v) return v;
      await sleep(120);
    }
    return null;
  };
  const findMenuItem = (labels) => {
    const items = [...document.querySelectorAll('div[role="menuitem"], div[role="menuitemcheckbox"]')];
    return items.find(el => {
      const t = (el.innerText || '').trim().toLowerCase();
      return labels.some(l => t.startsWith(l));
    });
  };
  const findDialogButton = (labels) => {
    const dlg = document.querySelector('div[role="dialog"]');
    if (!dlg) return null;
    return [...dlg.querySelectorAll('div[role="button"], button')].find(el => {
      const t = (el.innerText || '').trim().toLowerCase();
      return labels.some(l => t === l);
    });
  };
  window.STOP_BULK = false;
  console.log('%cFB unfriend — abort: window.STOP_BULK = true', 'font-weight:bold;color:#c00');
  let count = 0, failures = 0;
  while (count < CAP) {
    if (window.STOP_BULK) break;
    const btns = [...document.querySelectorAll(FRIEND_BTN)];
    if (!btns.length) {
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(1500);
      const more = document.querySelectorAll(FRIEND_BTN);
      if (!more.length) { console.log('No more "Friends" buttons in view.'); break; }
    }
    const btn = document.querySelector(FRIEND_BTN);
    if (!btn) break;
    btn.scrollIntoView({ block: 'center' });
    btn.click();
    const item = await waitFor(() => findMenuItem(['unfriend', 'remove from friends']));
    if (!item) {
      failures++;
      console.warn('Unfriend menu item not found; skipping.');
      document.body.click();
      await sleep(rand(MIN_DELAY, MAX_DELAY));
      continue;
    }
    item.click();
    const confirm = await waitFor(() => findDialogButton(['confirm', 'remove', 'unfriend']));
    if (confirm) confirm.click();
    count++;
    console.log('(' + count + '/' + CAP + ') unfriended');
    await sleep(rand(MIN_DELAY, MAX_DELAY));
    if (count % 25 === 0) {
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(1500);
    }
  }
  console.log('%cDone. ' + count + ' unfriended, ' + failures + ' skipped.', 'font-weight:bold;color:#080');
})();`;

  const fbUnfollow = (c) => `// === Facebook: unfollow everyone ===
// Open facebook.com/friends/following, then run. Abort: window.STOP_BULK = true
(async () => {
  const MIN_DELAY = ${c.min}, MAX_DELAY = ${c.max}, CAP = ${c.cap};
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const rand = (a,b) => Math.floor(a + Math.random() * (b - a));
  const findFollowingButton = () => {
    const all = [...document.querySelectorAll('div[role="button"], button')];
    return all.find(el => {
      const lbl = (el.getAttribute('aria-label') || el.innerText || '').trim().toLowerCase();
      return lbl === 'following';
    });
  };
  const findMenuItem = (labels) => {
    const items = [...document.querySelectorAll('div[role="menuitem"], div[role="menuitemcheckbox"]')];
    return items.find(el => {
      const t = (el.innerText || '').trim().toLowerCase();
      return labels.some(l => t.startsWith(l));
    });
  };
  window.STOP_BULK = false;
  console.log('%cFB unfollow — abort: window.STOP_BULK = true', 'font-weight:bold;color:#c00');
  let count = 0, idle = 0;
  while (count < CAP && idle < 3) {
    if (window.STOP_BULK) break;
    const btn = findFollowingButton();
    if (!btn) {
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(1500);
      idle++;
      continue;
    }
    idle = 0;
    btn.scrollIntoView({ block: 'center' });
    btn.click();
    await sleep(400);
    const item = await (async () => {
      const t0 = Date.now();
      while (Date.now() - t0 < 3000) {
        const m = findMenuItem(['unfollow']);
        if (m) return m;
        await sleep(120);
      }
      return null;
    })();
    if (item) {
      item.click();
      count++;
      console.log('(' + count + '/' + CAP + ') unfollowed');
    } else {
      console.warn('Unfollow item not found; closing menu.');
      document.body.click();
    }
    await sleep(rand(MIN_DELAY, MAX_DELAY));
  }
  console.log('%cDone. ' + count + ' unfollowed.', 'font-weight:bold;color:#080');
})();`;

  const thUnfollow = (c) => `// === Threads: unfollow everyone you follow ===
// Open threads.com, your profile, click Following to open the modal, then run.
// Abort: window.STOP_BULK = true
(async () => {
  const MIN_DELAY = ${c.min}, MAX_DELAY = ${c.max}, CAP = ${c.cap};
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const rand = (a,b) => Math.floor(a + Math.random() * (b - a));
  const dialog = () => document.querySelector('div[role="dialog"]');
  const scroller = () => {
    const d = dialog(); if (!d) return null;
    const all = d.querySelectorAll('*');
    for (const el of all) {
      const s = getComputedStyle(el);
      if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) return el;
    }
    return d;
  };
  const followingButtons = () => {
    const d = dialog(); if (!d) return [];
    return [...d.querySelectorAll('div[role="button"], button')].filter(el => {
      const t = (el.innerText || '').trim().toLowerCase();
      return t === 'following';
    });
  };
  const findConfirm = async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 3000) {
      const dlgs = [...document.querySelectorAll('div[role="dialog"]')];
      const top = dlgs[dlgs.length - 1];
      if (top) {
        const btn = [...top.querySelectorAll('div[role="button"], button')]
          .find(el => (el.innerText || '').trim().toLowerCase() === 'unfollow');
        if (btn) return btn;
      }
      await sleep(120);
    }
    return null;
  };
  if (!dialog()) { console.error('Open the Following dialog first.'); return; }
  window.STOP_BULK = false;
  console.log('%cThreads unfollow — abort: window.STOP_BULK = true', 'font-weight:bold;color:#c00');
  let count = 0, idle = 0;
  while (count < CAP && idle < 4) {
    if (window.STOP_BULK) break;
    const btns = followingButtons();
    if (!btns.length) {
      const sc = scroller(); if (sc) sc.scrollTop = sc.scrollHeight;
      await sleep(1500);
      idle++;
      continue;
    }
    idle = 0;
    const btn = btns[0];
    btn.scrollIntoView({ block: 'center' });
    btn.click();
    const ok = await findConfirm();
    if (ok) {
      ok.click();
      count++;
      console.log('(' + count + '/' + CAP + ') unfollowed');
    } else {
      console.warn('Confirm button not found, skipping.');
      document.body.click();
    }
    await sleep(rand(MIN_DELAY, MAX_DELAY));
  }
  console.log('%cDone. ' + count + ' unfollowed.', 'font-weight:bold;color:#080');
})();`;

  const thRemove = (c) => `// === Threads: remove all your followers ===
// Open your profile, click Followers to open the modal, then run.
// Abort: window.STOP_BULK = true
(async () => {
  const MIN_DELAY = ${c.min}, MAX_DELAY = ${c.max}, CAP = ${c.cap};
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const rand = (a,b) => Math.floor(a + Math.random() * (b - a));
  const dialog = () => document.querySelector('div[role="dialog"]');
  const scroller = () => {
    const d = dialog(); if (!d) return null;
    for (const el of d.querySelectorAll('*')) {
      const s = getComputedStyle(el);
      if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) return el;
    }
    return d;
  };
  const removeButtons = () => {
    const d = dialog(); if (!d) return [];
    return [...d.querySelectorAll('div[role="button"], button')].filter(el => {
      const t = (el.innerText || '').trim().toLowerCase();
      return t === 'remove';
    });
  };
  const findConfirm = async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 3000) {
      const dlgs = [...document.querySelectorAll('div[role="dialog"]')];
      const top = dlgs[dlgs.length - 1];
      if (top) {
        const btn = [...top.querySelectorAll('div[role="button"], button')]
          .find(el => /^remove$/i.test((el.innerText || '').trim()));
        if (btn) return btn;
      }
      await sleep(120);
    }
    return null;
  };
  if (!dialog()) { console.error('Open the Followers dialog first.'); return; }
  window.STOP_BULK = false;
  console.log('%cThreads remove followers — abort: window.STOP_BULK = true', 'font-weight:bold;color:#c00');
  let count = 0, idle = 0;
  while (count < CAP && idle < 4) {
    if (window.STOP_BULK) break;
    const btns = removeButtons();
    if (!btns.length) {
      const sc = scroller(); if (sc) sc.scrollTop = sc.scrollHeight;
      await sleep(1500);
      idle++;
      continue;
    }
    idle = 0;
    const btn = btns[0];
    btn.scrollIntoView({ block: 'center' });
    btn.click();
    const ok = await findConfirm();
    if (ok) { ok.click(); count++; console.log('(' + count + '/' + CAP + ') removed'); }
    else { console.warn('Confirm not found, skipping.'); document.body.click(); }
    await sleep(rand(MIN_DELAY, MAX_DELAY));
  }
  console.log('%cDone. ' + count + ' removed.', 'font-weight:bold;color:#080');
})();`;

  const templates = {
    'snip-ig-unfollow': igUnfollow,
    'snip-ig-remove': igRemove,
    'snip-fb-unfriend': fbUnfriend,
    'snip-fb-unfollow': fbUnfollow,
    'snip-th-unfollow': thUnfollow,
    'snip-th-remove': thRemove,
  };

  const cfgInputs = {
    min: document.getElementById('cfg-min'),
    max: document.getElementById('cfg-max'),
    cap: document.getElementById('cfg-cap'),
  };

  const readCfg = () => {
    const min = Math.max(500, parseInt(cfgInputs.min.value, 10) || 3000);
    let max = Math.max(min + 500, parseInt(cfgInputs.max.value, 10) || 8000);
    const cap = Math.max(1, parseInt(cfgInputs.cap.value, 10) || 150);
    return { min, max, cap };
  };

  const render = () => {
    const cfg = readCfg();
    for (const [id, fn] of Object.entries(templates)) {
      const el = document.getElementById(id);
      if (el) el.textContent = fn(cfg);
    }
  };

  Object.values(cfgInputs).forEach(i => i.addEventListener('input', render));
  render();
})();
