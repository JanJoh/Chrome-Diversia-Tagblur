(() => {
  "use strict";

  // Firefox and Safari expose `browser` with promises; Chrome exposes `chrome`.
  // Promise-style calls work in all three, callbacks only in Chrome, so every
  // call below is written as a promise.
  const ext = globalThis.browser || globalThis.chrome;

  const DEFAULTS = { blocked: [], preblur: true, blurPx: 24, lang: DTB_DEFAULT_LANG, lookups: true };
  const CACHE_KEY = "tagCache";
  const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // tags rarely change

  // Background lookups are kept light on the site and shared by every
  // diversia tab (see withLookupSlot).
  const PAUSE_MIN_MS = 1500;
  const PAUSE_MAX_MS = 4000;
  const MAX_PER_MINUTE = 20;
  const BREAKER_MS = 15 * 60 * 1000;
  const STATE_KEY = "lookupState"; // { last, recent: [ts], pausedUntil, reason }
  const ACTION_KEY = "gAction"; // { value, failed } for the /g.php fragment endpoint
  const LOCK_NAME = "dtb-lookup";

  const THUMB_SEL = 'a[href*="bild="]:is([style*="background"], :has(img:not([src*="/pres/bnrs/"])))';
  const TAG_LINK_SEL = 'a[href*="/pic/?tag="], a[href*="pic/?tag="]';

  let settings = DEFAULTS;
  let blockedSet = new Set();
  let cache = {};
  let gAction = null;

  // ---- settings -----------------------------------------------------------

  const norm = (s) => s.trim().replace(/^#/, "").toLowerCase();

  function applySettings(s) {
    settings = { ...DEFAULTS, ...s };
    blockedSet = new Set(settings.blocked.map(norm).filter(Boolean));
    const root = document.documentElement;
    root.classList.toggle("dtb-nopre", !settings.preblur || blockedSet.size === 0);
    root.style.setProperty("--dtb-blur", `${settings.blurPx}px`);
  }

  // A tag matches if the user listed its ID (k63) or its name (Blod).
  function blockingTags(tags) {
    return tags.filter((t) => blockedSet.has(t.id) || blockedSet.has(norm(t.name)));
  }

  // ---- tag extraction -----------------------------------------------------

  function tagsFromLinks(links) {
    const out = new Map();
    for (const a of links) {
      const m = (a.getAttribute("href") || "").match(/[?&]tag=([a-z]*\d+)/i);
      if (m) out.set(m[1].toLowerCase(), (a.getAttribute("title") || a.textContent).replace(/^#/, "").trim());
    }
    return [...out].map(([id, name]) => ({ id, name }));
  }

  // The main picture on a single-image page. Sidebar thumbnails (#g_list) use
  // the same class, but they sit inside bild= links; the main picture doesn't.
  const mainPic = (doc) =>
    [...doc.querySelectorAll("img.picshadow")].find((p) => !p.closest('a[href*="bild="]'));

  // On a single-image page (or a /g.php fragment) the tags live in the same
  // .row as the picture. null means "this isn't an image page".
  function tagsFromImagePage(doc) {
    const pic = mainPic(doc);
    if (!pic) return null;
    const scope = pic.closest(".row") || doc;
    return tagsFromLinks(scope.querySelectorAll(TAG_LINK_SEL));
  }

  const bildId = (href) => ((href || "").match(/[?&]bild=(\d+)/) || [])[1];

  // Gallery pages (/pic/?tag=…) list every tag in .gcats2 boxes: the first box
  // holds the general categories (g…), the second the specific tags (k…).
  // Keep a copy so the options page can offer a checklist.
  function harvestTagList() {
    const boxes = document.querySelectorAll(".gcats2");
    if (!boxes.length) return;
    const tags = tagsFromLinks([...boxes].flatMap((b) => [...b.querySelectorAll(TAG_LINK_SEL)]));
    if (tags.length) ext.storage.local.set({ tagList: { tags, t: Date.now() } });
  }

  // Image pages carry the site's own picture switcher, getpic(), in an inline
  // script. It loads a /g.php fragment (~35 KB instead of ~130 KB) that has
  // the tags; learn its action word so lookups can use the same request.
  async function learnAction() {
    const inline = [...document.scripts].filter((s) => !s.src).map((s) => s.textContent).join("\n");
    const found = (inline.match(/g\.php\?a=([A-Za-z0-9_]+)/) || [])[1];
    const { [ACTION_KEY]: stored = {} } = await ext.storage.local.get(ACTION_KEY);
    if (found && found !== stored.value && found !== stored.failed) {
      await ext.storage.local.set({ [ACTION_KEY]: { ...stored, value: found } });
      stored.value = found;
    }
    gAction = stored.value && stored.value !== stored.failed ? stored.value : null;
  }

  // ---- cache ----------------------------------------------------------------

  const fresh = (id) => {
    const hit = cache[id];
    return hit && Date.now() - hit.t < CACHE_TTL_MS ? hit : null;
  };

  let saveTimer = null;
  function remember(id, tags) {
    cache[id] = { tags, t: Date.now() };
    clearTimeout(saveTimer);
    // Merge with what other tabs have stored meanwhile instead of overwriting.
    saveTimer = setTimeout(async () => {
      const { [CACHE_KEY]: stored = {} } = await ext.storage.local.get(CACHE_KEY);
      cache = { ...stored, ...cache };
      await ext.storage.local.set({ [CACHE_KEY]: cache });
    }, 1000);
  }

  function pruneCache() {
    const now = Date.now();
    for (const [id, hit] of Object.entries(cache)) if (now - hit.t >= CACHE_TTL_MS) delete cache[id];
  }

  // ---- paced lookups ----------------------------------------------------------

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const randomPause = () => PAUSE_MIN_MS + Math.random() * (PAUSE_MAX_MS - PAUSE_MIN_MS);

  // Run one lookup under a lock shared by all diversia tabs (same origin), so
  // pacing and the per-minute cap hold across tabs, not per tab.
  async function withLookupSlot(fn) {
    const run = async () => {
      const { [STATE_KEY]: st = {} } = await ext.storage.local.get(STATE_KEY);
      if ((st.pausedUntil || 0) > Date.now()) return { paused: st.pausedUntil };
      let now = Date.now();
      const recent = (st.recent || []).filter((t) => now - t < 60000);
      let wait = Math.max(0, (st.last || 0) + randomPause() - now);
      if (recent.length >= MAX_PER_MINUTE) wait = Math.max(wait, recent[0] + 60000 - now + randomPause());
      if (wait) await sleep(wait);

      const result = await fn();

      now = Date.now();
      const next = { ...st, last: now, recent: [...recent.filter((t) => now - t < 60000), now] };
      if (result.fail) {
        next.pausedUntil = now + BREAKER_MS;
        next.reason = result.fail;
        console.warn(`[diversia-tag-blur] lookups paused 15 min: ${result.fail}`);
      }
      await ext.storage.local.set({ [STATE_KEY]: next });
      return result;
    };
    return navigator.locks ? navigator.locks.request(LOCK_NAME, run) : run();
  }

  // Fetch one image's tags: the light /g.php fragment when we know its action
  // word, else the full image page. Anything that isn't an image page (login
  // page, error, captcha, redirect) is a failure and trips the pause.
  async function fetchTags(id) {
    const viaFragment = !!gAction;
    const url = viaFragment ? `/g.php?a=${encodeURIComponent(gAction)}&id=${id}` : `/pic/?bild=${id}`;
    try {
      const res = await fetch(url, { credentials: "include" });
      const html = await res.text();
      const tags = res.ok && !res.redirected
        ? tagsFromImagePage(new DOMParser().parseFromString(html, "text/html"))
        : null;
      if (tags) return { tags };
      if (viaFragment) {
        // Stop using this action word; the full page is the fallback from now on.
        const { [ACTION_KEY]: stored = {} } = await ext.storage.local.get(ACTION_KEY);
        await ext.storage.local.set({ [ACTION_KEY]: { ...stored, failed: gAction } });
        gAction = null;
      }
      return { fail: `unexpected response for image ${id} (HTTP ${res.status})` };
    } catch (e) {
      return { fail: `request failed for image ${id}: ${e.message}` };
    }
  }

  // Thumbnails waiting for tags, by image id. Only ones on (or near) the
  // screen are looked up; the rest wait until they scroll into view.
  const waiters = new Map(); // id -> Set<element>
  const visible = new Set();
  const queue = []; // ids, in the order they became visible
  let pumping = false;
  let resumeTimer = null;

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        visible.add(e.target);
        const id = e.target.dataset.dtbId;
        if (id && !queue.includes(id)) queue.push(id);
      } else {
        visible.delete(e.target);
      }
    }
    pump();
  }, { rootMargin: "300px 0px" });

  function track(el, id) {
    if (!waiters.has(id)) waiters.set(id, new Set());
    waiters.get(id).add(el);
    io.observe(el);
  }

  function resolveId(id, tags) {
    for (const el of waiters.get(id) ?? []) {
      mark(el, tags);
      io.unobserve(el);
      visible.delete(el);
    }
    waiters.delete(id);
  }

  const wanted = (id) => [...(waiters.get(id) ?? [])].some((el) => el.isConnected && visible.has(el));

  async function pump() {
    if (pumping || !settings.lookups || blockedSet.size === 0) return;
    pumping = true;
    try {
      for (;;) {
        const i = queue.findIndex(wanted);
        if (i < 0) break;
        const [id] = queue.splice(i, 1);
        const hit = fresh(id); // another tab may have looked it up meanwhile
        if (hit) { resolveId(id, hit.tags); continue; }

        const r = await withLookupSlot(() => fetchTags(id));
        if (r.tags) { remember(id, r.tags); resolveId(id, r.tags); continue; }

        // Paused (now or by another tab): keep the id, try again afterwards.
        queue.unshift(id);
        const { [STATE_KEY]: st = {} } = await ext.storage.local.get(STATE_KEY);
        clearTimeout(resumeTimer);
        resumeTimer = setTimeout(pump, Math.max(0, (st.pausedUntil || 0) - Date.now()) + 1000);
        break;
      }
    } finally {
      pumping = false;
    }
  }

  // ---- marking elements ---------------------------------------------------

  const MAX_TAGS = 3;
  const MAX_TAGS_SMALL = 2;

  function shortList(hits, max) {
    const names = hits.map((t) => t.name);
    if (names.length <= max) return names.join(", ");
    return names.slice(0, max).join(", ") + " " + dtbT(settings.lang, "more", { n: names.length - max });
  }

  function mark(el, tags) {
    if (el.dataset.dtbTitle === undefined) el.dataset.dtbTitle = el.title;
    const hits = blockingTags(tags);
    if (hits.length) {
      // The label overlay is absolutely positioned inside the element. Inline
      // links (the sidebar #g_list) are only a text line tall around their
      // picture, so make them wrap it or the overlay covers just a strip.
      const cs = getComputedStyle(el);
      if (cs.position === "static") el.style.position = "relative";
      if (cs.display === "inline") el.style.display = "inline-block";
      // Small thumbnails (e.g. the 100px sidebar) only get the tag names.
      const small = el.getBoundingClientRect().width < 180;
      el.toggleAttribute("data-dtb-small", small);
      // An image can match many tags; the overlay names a few and counts the
      // rest ("+4 till"), the tooltip lists them all.
      const shown = shortList(hits, small ? MAX_TAGS_SMALL : MAX_TAGS);
      el.dataset.dtbLabel = dtbT(settings.lang, "label", { tags: shown });
      el.dataset.dtbShort = shown;
      el.dataset.dtbFull = dtbT(settings.lang, "label", { tags: hits.map((t) => t.name).join(", ") })
        .replace("\n", " ");
    }
    el.classList.toggle("dtb-blocked", hits.length > 0);
    el.classList.toggle("dtb-ok", hits.length === 0);
    el.title = hits.length ? el.dataset.dtbFull : el.dataset.dtbTitle;
  }

  // If we are browsing a blocked tag's gallery, every thumbnail carries it.
  let galleryTagMemo;
  function galleryTag() {
    if (galleryTagMemo !== undefined) return galleryTagMemo;
    const m = location.search.match(/[?&]tag=([a-z]*\d+)/i);
    if (!m) return (galleryTagMemo = null);
    const id = m[1].toLowerCase();
    const tag = tagsFromLinks(document.querySelectorAll(".gcats2 " + TAG_LINK_SEL.split(", ").join(", .gcats2 ")))
      .find((t) => t.id === id) ?? { id, name: id };
    return (galleryTagMemo = blockingTags([tag]).length ? tag : null);
  }

  // The main picture's tags are on the page itself. Clicking a sidebar
  // thumbnail swaps picture and tags in place (the site's getpic()), so
  // re-check whenever the picture or its tags change.
  function checkMainPic() {
    const pic = mainPic(document);
    if (!pic?.parentElement) return;
    const box = pic.parentElement;
    const tags = tagsFromImagePage(document) || [];
    const key = [pic.getAttribute("src"), pic.getAttribute("style"), tags.map((t) => t.id).join()].join("|");
    if (box.dataset.dtbKey === key) return;
    const first = box.dataset.dtbKey === undefined;
    box.dataset.dtbKey = key;
    box.classList.remove("dtb-revealed");
    mark(box, tags);
    // Only trust the URL's image id on the initial page load; after an
    // in-page switch it may not have been updated yet.
    const id = bildId(location.search);
    if (first && id) remember(id, tags);
  }

  function scanThumbs(root) {
    const gTag = galleryTag();
    for (const a of root.querySelectorAll?.(THUMB_SEL) ?? []) {
      if (a.dataset.dtbSeen) continue;
      const id = bildId(a.getAttribute("href"));
      if (!id) continue;
      a.dataset.dtbSeen = "1";
      a.dataset.dtbId = id;
      if (gTag) { mark(a, [gTag]); continue; }
      const hit = fresh(id);
      if (hit) mark(a, hit.tags);
      else track(a, id); // stays pre-blurred until looked up
    }
  }

  function scan(root = document) {
    if (blockedSet.size === 0) return;
    checkMainPic();
    scanThumbs(root);
  }

  function rescanAll() {
    document.querySelectorAll("[data-dtb-seen], [data-dtb-key]").forEach((el) => {
      delete el.dataset.dtbSeen;
      delete el.dataset.dtbKey;
      el.classList.remove("dtb-ok", "dtb-blocked", "dtb-revealed");
    });
    galleryTagMemo = undefined;
    scan();
    pump();
  }

  // First click on a blurred image reveals it; the next click behaves normally.
  document.addEventListener("click", (e) => {
    const el = e.target.closest?.(".dtb-blocked:not(.dtb-revealed)");
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    el.classList.add("dtb-revealed");
  }, true);

  // ---- boot ---------------------------------------------------------------

  (async () => {
    applySettings(await ext.storage.sync.get(DEFAULTS));
    const c = await ext.storage.local.get({ [CACHE_KEY]: {} });
    cache = c[CACHE_KEY];
    pruneCache();
    const start = async () => {
      harvestTagList();
      await learnAction();
      scan();
      new MutationObserver((muts) => {
        if (blockedSet.size === 0) return;
        checkMainPic();
        for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) scanThumbs(n.parentElement || n);
      }).observe(document.body, { childList: true, subtree: true });
    };
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", start) : start();
  })();

  ext.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      // Cleared from the options page.
      if (changes[CACHE_KEY] && !changes[CACHE_KEY].newValue) cache = {};
      // Another tab looked something up: use it for thumbnails still waiting here.
      if (changes[CACHE_KEY]?.newValue) {
        cache = { ...changes[CACHE_KEY].newValue, ...cache };
        for (const id of [...waiters.keys()]) { const hit = fresh(id); if (hit) resolveId(id, hit.tags); }
      }
      // Pause lifted (the options page's resume button).
      if (changes[STATE_KEY] && !(changes[STATE_KEY].newValue?.pausedUntil > Date.now())) pump();
      return;
    }
    if (area === "sync") ext.storage.sync.get(DEFAULTS).then((s) => { applySettings(s); rescanAll(); });
  });
})();
