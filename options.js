// Firefox and Safari expose `browser` with promises; Chrome exposes `chrome`.
// Promise-style calls work in all three, callbacks only in Chrome.
const ext = globalThis.browser || globalThis.chrome;

const DEFAULTS = { blocked: [], preblur: true, blurPx: 24, lang: DTB_DEFAULT_LANG, lookups: true, updateCheck: true };
const $ = (id) => document.getElementById(id);

let lang = DTB_DEFAULT_LANG;
const t = (key, vars) => dtbT(lang, key, vars);

let known = []; // [{id, name}] from diversia's gallery pages or tags.json
let tagList = null; // { tags, t, bundled? }
let listStatus = "ok"; // "ok" | "updating" | "failed"
const checked = new Set();

function flash(key) {
  $("status").textContent = t(key);
  setTimeout(() => ($("status").textContent = ""), 1500);
}

// Fill every [data-i18n] / [data-i18n-placeholder] element for the current language.
function applyLanguage() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) el.placeholder = t(el.dataset.i18nPlaceholder);
  renderHint();
  renderList();
  renderPause();
  renderUpdate();
}

// ---- lookup pause (set by content.js when the site answers unexpectedly) ----

let pausedUntil = 0;

function renderPause() {
  const on = pausedUntil > Date.now();
  $("paused").hidden = !on;
  if (on) {
    const time = new Date(pausedUntil).toLocaleTimeString(lang === "sv" ? "sv-SE" : "en-GB", { hour: "2-digit", minute: "2-digit" });
    $("pausedtext").textContent = t("lookupPaused", { time });
  }
}

ext.storage.local.get({ lookupState: {} }).then(({ lookupState }) => {
  pausedUntil = lookupState.pausedUntil || 0;
  renderPause();
});

$("resume").addEventListener("click", async (e) => {
  e.preventDefault();
  const { lookupState = {} } = await ext.storage.local.get("lookupState");
  await ext.storage.local.set({ lookupState: { ...lookupState, pausedUntil: 0 } });
  pausedUntil = 0;
  renderPause();
});

function renderList() {
  const q = $("filter").value.trim().toLowerCase();
  const list = $("list");
  list.textContent = "";
  const groups = [
    ["groupSelected", q ? [] : known.filter((x) => checked.has(x.id))],
    ["groupCategories", known.filter((x) => x.id.startsWith("g"))],
    ["groupTags", known.filter((x) => !x.id.startsWith("g"))],
  ];
  for (const [title, tags] of groups) {
    const shown = tags
      .filter((x) => !q || x.name.toLowerCase().includes(q) || x.id === q)
      .sort((a, b) => a.name.localeCompare(b.name, "sv"));
    if (!shown.length) continue;
    const h = document.createElement("h2");
    h.textContent = t(title);
    list.append(h);
    for (const tag of shown) {
      const label = document.createElement("label");
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = checked.has(tag.id);
      box.addEventListener("change", () => {
        box.checked ? checked.add(tag.id) : checked.delete(tag.id);
        // Re-render so the Selected group and the duplicate box stay in step.
        const scroll = list.scrollTop;
        renderList();
        list.scrollTop = scroll;
      });
      const code = document.createElement("code");
      code.textContent = tag.id;
      label.append(box, " ", tag.name, " ", code);
      list.append(label);
    }
  }
  $("count").textContent = checked.size ? t("selectedCount", { n: checked.size }) : "";
}

// ---- tag list -------------------------------------------------------------
//
// Sources, best first: the list last fetched from diversia (storage), else the
// snapshot shipped in tags.json. When the panel opens, a stale or bundled list
// is refreshed from a gallery page in the background using the user's login.

const TAG_PAGE = "https://diversia.social/pic/?tag=g2";
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;

function renderHint() {
  if (!tagList) return;
  if (listStatus === "updating") return void ($("listhint").textContent = t("listUpdating"));
  const vars = {
    n: known.length,
    date: new Date(tagList.t).toLocaleDateString(lang === "sv" ? "sv-SE" : "en-GB"),
  };
  let text = t(tagList.bundled ? "listBundled" : "listUpdated", vars);
  if (listStatus === "failed") text += " " + t("listFailed");
  $("listhint").textContent = text;
}

function setTagList(list) {
  tagList = list;
  known = list.tags;
}

async function loadBundled() {
  const j = await (await fetch(ext.runtime.getURL("tags.json"))).json();
  return { tags: j.tags, t: Date.parse(j.collected), bundled: true };
}

// Same markup as content.js harvestTagList(): .gcats2 boxes on gallery pages.
function parseTagList(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out = new Map();
  for (const a of doc.querySelectorAll('.gcats2 a[href*="tag="]')) {
    const m = (a.getAttribute("href") || "").match(/[?&]tag=([a-z]*\d+)/i);
    if (m) out.set(m[1].toLowerCase(), (a.getAttribute("title") || a.textContent).replace(/^#/, "").trim());
  }
  return [...out].map(([id, name]) => ({ id, name }));
}

async function refreshFromSite() {
  listStatus = "updating";
  renderHint();
  try {
    const res = await fetch(TAG_PAGE, { credentials: "include" });
    const tags = parseTagList(await res.text());
    if (!tags.length) throw new Error("no tag list on page");
    const fresh = { tags, t: Date.now() };
    await ext.storage.local.set({ tagList: fresh });
    setTagList(fresh);
    listStatus = "ok";
    renderList();
  } catch (e) {
    console.warn("[diversia-tag-blur] tag list refresh failed", e);
    listStatus = "failed";
  }
  renderHint();
}

// ---- version check --------------------------------------------------------
//
// Once a day, when the panel is opened, ask GitHub for the latest release tag
// and compare it with this build's version. This is the extension's only
// request to anything other than diversia.social: no cookies, no headers of
// our own, nothing about the user or their tags. "Look for new versions"
// switches it off entirely.

const RELEASE_API = "https://api.github.com/repos/JanJoh/Diversia-Tagblur/releases/latest";
const CHECK_AFTER_MS = 24 * 60 * 60 * 1000;
// A failed check comes back sooner than a successful one. A check made before
// the project's first release ever existed must not suppress the notice for a
// whole day afterwards.
const RETRY_AFTER_MS = 60 * 60 * 1000;
const CHECK_KEY = "versionCheck"; // { t, latest }

let latestVersion = null; // tag of the newest release we know of, e.g. "v0.4.0"

// "v0.4.0" -> [0, 4, 0]. Extension versions are 1-4 dot-separated integers.
const parseVersion = (v) =>
  String(v).trim().replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);

function isNewer(a, b) {
  const [x, y] = [parseVersion(a), parseVersion(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  }
  return false;
}

function renderUpdate() {
  const show = !!latestVersion && isNewer(latestVersion, ext.runtime.getManifest().version);
  $("update").hidden = !show;
  if (show) $("updatetext").textContent = t("updateAvailable", { version: latestVersion.replace(/^v/i, "") });
}

async function checkForUpdate(force) {
  const { [CHECK_KEY]: last = {} } = await ext.storage.local.get(CHECK_KEY);
  latestVersion = last.latest || null;
  renderUpdate();
  // A check that failed is retried in an hour; one that succeeded, tomorrow.
  const waitFor = last.failed ? RETRY_AFTER_MS : CHECK_AFTER_MS;
  if (!force && Date.now() - (last.t || 0) < waitFor) return last;
  try {
    const res = await fetch(RELEASE_API, { credentials: "omit", cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const tag = (await res.json()).tag_name;
    if (!tag) throw new Error("no tag_name in response");
    latestVersion = tag;
    await ext.storage.local.set({ [CHECK_KEY]: { t: Date.now(), latest: tag } });
    renderUpdate();
    return { ok: true, latest: tag };
  } catch (e) {
    // Keep the old answer, but mark the attempt as failed so it is tried again
    // within the hour rather than tomorrow.
    console.warn("[diversia-tag-blur] version check failed", e);
    await ext.storage.local.set({ [CHECK_KEY]: { ...last, t: Date.now(), failed: true } });
    return { ok: false, latest: latestVersion };
  }
}

// ---- init -----------------------------------------------------------------

(async () => {
  let { tagList: stored } = await ext.storage.local.get({ tagList: null });
  setTagList(stored?.tags?.length ? stored : await loadBundled());

  const s = await ext.storage.sync.get(DEFAULTS);
  lang = DTB_STRINGS[s.lang] ? s.lang : DTB_DEFAULT_LANG;
  $("lang").value = lang;
  const knownIds = new Set(known.map((x) => x.id));
  const extra = [];
  for (const b of s.blocked) (knownIds.has(b.toLowerCase()) ? checked.add(b.toLowerCase()) : extra.push(b));
  $("extra").value = extra.join("\n");
  $("preblur").checked = s.preblur;
  $("lookups").checked = s.lookups;
  $("updateCheck").checked = s.updateCheck;
  $("blurPx").value = s.blurPx;
  applyLanguage();

  if (tagList.bundled || Date.now() - tagList.t > REFRESH_AFTER_MS) refreshFromSite();
  if (s.updateCheck) checkForUpdate();
})();

// Switching language applies at once and is stored straight away, so the
// labels on open diversia tabs follow without pressing Save.
$("lang").addEventListener("change", () => {
  lang = $("lang").value;
  ext.storage.sync.set({ lang });
  applyLanguage();
});

$("refresh").addEventListener("click", (e) => {
  e.preventDefault();
  refreshFromSite();
});

$("filter").addEventListener("input", renderList);

$("save").addEventListener("click", () => {
  const extra = $("extra").value.split("\n").map((l) => l.trim()).filter(Boolean);
  const blocked = [...checked, ...extra];
  const blurPx = Math.min(80, Math.max(4, parseInt($("blurPx").value, 10) || DEFAULTS.blurPx));
  // Sync storage allows ~8 KB per setting; all 238 tags ticked is ~2 KB, but a
  // huge "other tags" list could exceed it, so report failures.
  const updateCheck = $("updateCheck").checked;
  ext.storage.sync.set(
    { blocked, preblur: $("preblur").checked, lookups: $("lookups").checked, updateCheck, blurPx, lang },
  ).then(() => flash("saved"), () => flash("saveFailed"));
  // Switching the check off takes down a notice it put up; switching it on
  // asks straight away instead of waiting for the next time the panel opens.
  if (updateCheck) checkForUpdate();
  else { latestVersion = null; renderUpdate(); }
});

$("clear").addEventListener("click", () => {
  ext.storage.local.remove("tagCache").finally(() => flash("cleared"));
});
