// UI strings. Swedish is the default; the language is a setting ("lang") so it
// does not depend on the browser's UI language. Shared by content.js and
// options.js ({name} placeholders are filled by dtbT).

const DTB_DEFAULT_LANG = "sv";

const DTB_STRINGS = {
  sv: {
    label: "Innehåller tag(s): {tags}\n(klicka för att visa)",
    more: "+{n} till",
    tagsToBlur: "Taggar att sudda ut",
    selectedCount: "({n} valda)",
    search: "Sök taggar…",
    groupSelected: "Valda",
    groupCategories: "Kategorier",
    groupTags: "Taggar",
    listBundled: "{n} taggar (inbyggd lista från {date}).",
    listUpdated: "{n} taggar, uppdaterad från diversia {date}.",
    listUpdating: "Uppdaterar tagglistan från diversia…",
    listFailed: "Kunde inte uppdatera från diversia (är du inloggad?).",
    refresh: "Uppdatera",
    other: "Andra taggar (namn eller id, en per rad)",
    preblur: "Sudda ut bilder tills de har kontrollerats",
    lookups: "Kontrollera miniatyrer i bakgrunden",
    lookupsHint: "Hämtar taggar för synliga miniatyrer, en i taget med slumpade pauser (högst 20/minut). Av: inga bakgrundsanrop, men okontrollerade miniatyrer förblir utsuddade.",
    lookupPaused: "Bakgrundskontroller pausade till {time}: sajten svarade oväntat.",
    resume: "Återuppta",
    blurPx: "Oskärpa (px)",
    language: "Språk",
    save: "Spara",
    clear: "Glöm kontrollerade bilder",
    saved: "Sparat",
    saveFailed: "Kunde inte spara (för lång lista?)",
    cleared: "Cachen tömd",
  },
  en: {
    label: "Contains tag(s): {tags}\n(click to reveal)",
    more: "+{n} more",
    tagsToBlur: "Tags to blur",
    selectedCount: "({n} selected)",
    search: "Search tags…",
    groupSelected: "Selected",
    groupCategories: "Categories",
    groupTags: "Tags",
    listBundled: "{n} tags (built-in list from {date}).",
    listUpdated: "{n} tags, updated from diversia {date}.",
    listUpdating: "Updating tag list from diversia…",
    listFailed: "Couldn't update from diversia (logged in?).",
    refresh: "Refresh",
    other: "Other tags (by name or ID, one per line)",
    preblur: "Blur images until they have been checked",
    lookups: "Check thumbnails in the background",
    lookupsHint: "Fetches tags for visible thumbnails, one at a time with random pauses (at most 20/minute). Off: no background requests, but unchecked thumbnails stay blurred.",
    lookupPaused: "Background checks paused until {time}: the site answered unexpectedly.",
    resume: "Resume",
    blurPx: "Blur strength (px)",
    language: "Language",
    save: "Save",
    clear: "Forget checked images",
    saved: "Saved",
    saveFailed: "Could not save (list too long?)",
    cleared: "Cache cleared",
  },
};

function dtbT(lang, key, vars = {}) {
  const s = (DTB_STRINGS[lang] || DTB_STRINGS[DTB_DEFAULT_LANG])[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
