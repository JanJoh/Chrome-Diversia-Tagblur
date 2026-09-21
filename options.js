const DEFAULTS = { blocked: [], preblur: true, blurPx: 24, lang: DTB_DEFAULT_LANG, lookups: true };
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

chrome.storage.local.get({ lookupState: {} }, ({ lookupState }) => {
  pausedUntil = lookupState.pausedUntil || 0;
  renderPause();
});

$("resume").addEventListener("click", async (e) => {
  e.preventDefault();
  const { lookupState = {} } = await chrome.storage.local.get("lookupState");
  await chrome.storage.local.set({ lookupState: { ...lookupState, pausedUntil: 0 } });
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
  const j = await (await fetch(chrome.runtime.getURL("tags.json"))).json();
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
    await chrome.storage.local.set({ tagList: fresh });
    setTagList(fresh);
    listStatus = "ok";
    renderList();
  } catch (e) {
    console.warn("[diversia-tag-blur] tag list refresh failed", e);
    listStatus = "failed";
  }
  renderHint();
}

// ---- init -----------------------------------------------------------------

(async () => {
  let { tagList: stored } = await chrome.storage.local.get({ tagList: null });
  setTagList(stored?.tags?.length ? stored : await loadBundled());

  const s = await chrome.storage.sync.get(DEFAULTS);
  lang = DTB_STRINGS[s.lang] ? s.lang : DTB_DEFAULT_LANG;
  $("lang").value = lang;
  const knownIds = new Set(known.map((x) => x.id));
  const extra = [];
  for (const b of s.blocked) (knownIds.has(b.toLowerCase()) ? checked.add(b.toLowerCase()) : extra.push(b));
  $("extra").value = extra.join("\n");
  $("preblur").checked = s.preblur;
  $("lookups").checked = s.lookups;
  $("blurPx").value = s.blurPx;
  applyLanguage();

  if (tagList.bundled || Date.now() - tagList.t > REFRESH_AFTER_MS) refreshFromSite();
})();

// Switching language applies at once and is stored straight away, so the
// labels on open diversia tabs follow without pressing Save.
$("lang").addEventListener("change", () => {
  lang = $("lang").value;
  chrome.storage.sync.set({ lang });
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
  chrome.storage.sync.set({ blocked, preblur: $("preblur").checked, lookups: $("lookups").checked, blurPx, lang }, () =>
    flash(chrome.runtime.lastError ? "saveFailed" : "saved"));
});

$("clear").addEventListener("click", () => {
  chrome.storage.local.remove("tagCache", () => flash("cleared"));
});
