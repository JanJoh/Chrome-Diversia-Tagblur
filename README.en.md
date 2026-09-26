# Diversia Tag Blur

🇸🇪 [Svenska](README.md)

> **GenAI project.** The code, documentation and images in this repository were
> produced with generative AI (Claude). No proofreading or independent review has been
> done. Use at your own discretion.

A browser extension for **Chrome, Firefox and Safari** that blurs images on
[diversia.social](https://diversia.social) carrying tags you choose. Blurred images show which tags matched; one click
reveals the picture.

![Blurred thumbnails in a gallery and the sidebar](docs/exempel-utsuddning.png)

<sub>Demo page with placeholder pictures. The overlay and labels are the real
extension CSS.</sub>

## Contents

- [Install](#install)
  - [Chrome (and Edge, Brave…)](#chrome-and-edge-brave)
  - [Firefox](#firefox)
  - [Safari (Mac)](#safari-mac)
  - [Building it yourself](#building-it-yourself)
- [Usage](#usage)
  - [1. Choose tags](#1-choose-tags)
  - [2. Browse](#2-browse)
- [How it works](#how-it-works)
- [Background checks](#background-checks)
- [Version check](#version-check)
- [Privacy](#privacy)
- [If it stops working](#if-it-stops-working)
- [Development](#development)
  - [How it runs in three browsers](#how-it-runs-in-three-browsers)
- [License](#license)

## Install

The extension isn't in any browser store, so you install it yourself from a zip
file. It takes about a minute and needs no knowledge of code.

> **The stores:** I have no present intention of publishing to the Chrome Web
> Store, addons.mozilla.org or the App Store. Install it with the steps below.

**1. Download the file.** Open the [latest release](https://github.com/JanJoh/Chrome-Diversia-Tagblur/releases/latest) and get the one for your
browser:

| File to download | For |
|---|---|
| `diversia-tagblur-chrome-*.zip` | Chrome, Edge, Brave, Opera, Vivaldi |
| `diversia-tagblur-firefox-*.zip` | Firefox 140 or later, desktop and Android |
| `diversia-tagblur-safari-*.zip` | Safari on macOS, iOS and iPadOS |

**2. Unzip it.** Double-click the zip file. You get a folder — that folder is what
the browser loads, not the zip.

**3. Load the folder.** Follow the steps for your browser below.

### Chrome (and Edge, Brave…)

1. Open `chrome://extensions` in the address bar.
2. Switch on **Developer mode**, top right.
3. Click **Load unpacked** and pick the folder you unzipped.
4. Optional: pin the extension from the puzzle-piece icon in the toolbar.

It stays installed until you remove it.

**Updating:** replace the folder with the new version and click the reload arrow on
the extension's card in `chrome://extensions`.

### Firefox

Requires Firefox 140 or later.

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and pick the `manifest.json` file inside the
   folder.

It stays until Firefox restarts, and has to be loaded again after that. That's how
Firefox treats add-ons that don't come from its store.

**Permissions:** Firefox lets you decide on site access. If nothing is blurred on
Diversia, click the Extensions (puzzle piece) button and allow the extension on that
site.

### Safari (Mac)

Requires Safari 26 or later.

1. Go to Safari → Settings → **Developer**. If you don't see it, first switch on
   *Show features for web developers* under Advanced.
2. Click **Add Temporary Extension…** and pick the folder you unzipped.

It's unloaded when Safari quits, so add it again after a restart.

**Permissions:** Safari asks you to allow the extension per website. Choose *Always
allow on this website* for Diversia.

**On iPhone and iPad** an extension can't be loaded by hand. Safari extensions must
come from the App Store, which requires the Apple Developer Program — see
[Building it yourself](#building-it-yourself) below.

### Building it yourself

Only if you'd rather build from source than download a finished file:

```bash
npm run build
```

That creates `dist/chrome`, `dist/firefox` and `dist/safari` to load, plus one zip
per browser. The repository root is also a valid Chrome extension, so it can be
loaded directly.

## Usage

### 1. Choose tags

Click the extension icon. The panel is in Swedish by default; switch with
**Språk / Language** in the top right.

<img src="docs/installningar-v4.png" alt="Options panel" width="384">

The tag list (categories and tags, ~240 of them) is **built in**, so it's there from the
first click. When you open the panel while logged in to diversia, the list is refreshed
from the site in the background (at most once a day; **Uppdatera / Refresh** forces it).

- **Search** to filter the list, and **tick** the tags to blur. Ticked tags are listed under
  *Valda / Selected* at the top.
- **Other tags:** anything not in the list, by name (`Latex/gummi`) or ID (`k40`), one per
  line. The ID is the value after `?tag=` in a tag link.
- **Check thumbnails in the background** (on by default): fetches tags for the
  thumbnails you see. Read [Background checks](#background-checks) before deciding.
- **Blur images until they have been checked** (on by default): thumbnails start out
  blurred and are un-blurred once their tags are known, so a tagged image never flashes up.
- **Blur strength:** in pixels.
- **Look for new versions** (on by default): asks GitHub once a day whether a newer
  version exists, and if so shows a line at the top of the panel. See
  [Version check](#version-check).
- **Save.** Open diversia tabs update immediately.
- **Forget checked images** clears the tag cache (see below).

### 2. Browse

- Matching images are covered with a blur and a label:
  **Innehåller tag(s): Blod, Nållekar (klicka för att visa)**
  (in English: *Contains tag(s): … (click to reveal)*).
  Small thumbnails (like the gallery sidebar) show just the tag names.
- **Click once** to reveal the picture; click again to open it as usual.
- Hover for a tooltip with the same text.

## How it works

| Page | Where the tags come from |
|---|---|
| Single image (`/pic/?bild=…`) | Read straight from the page. |
| Gallery for a tag you blocked (`/pic/?tag=…`) | Every thumbnail carries that tag, so all are blurred without further lookups. |
| Feed, other galleries, the sidebar | Thumbnails carry no tags. The extension fetches each image's tags in the background (see below). |

Results are cached per image for 30 days, so revisiting a page costs nothing. Images you
open yourself are checked straight from the page, with no extra requests.

## Background checks

Overview pages (the feed, galleries, the sidebar) don't show image tags, so the extension
fetches the tags for the thumbnails you see from the site in the background.

Using background checks is **at your own risk**, and may go against the site's rules.

> If you switch off **Check thumbnails in the background**, no background requests are
> made, but then **all photos on overview pages may appear blurred**: unchecked thumbnails
> stay blurred (with *Blur images until they have been checked* on), and only images you
> open yourself are checked. If you also switch that setting off, unchecked thumbnails are
> shown normally instead, unfiltered.

The profile picture and header banner have no tags and are never blurred.

## Version check

The extension is installed unpacked and does not update itself, so it asks GitHub
whether a newer version exists instead. When you open the panel, and at most once a
day, it fetches the latest release's version number from
`https://api.github.com/repos/JanJoh/Chrome-Diversia-Tagblur/releases/latest`
and compares it with the installed version. If it is newer, a line appears at the top
of the panel linking to
[Releases](https://github.com/JanJoh/Chrome-Diversia-Tagblur/releases); otherwise
nothing is shown. A failed request is not reported, and is not retried before the next
day.

The request sends no cookies and no headers of its own, and carries nothing about you,
your tags or what you have looked at — only a question about the latest version number.
GitHub does of course see your IP address, as any web server would. Switch off **Look
for new versions** in the panel and the request is not made at all; you then update
manually by looking at the Releases page.

## Privacy

- Everything stays in your browser. Settings are kept in Chrome sync storage; the tag
  cache and tag list in local storage.
- The extension only runs on `diversia.social` and only talks to `diversia.social` —
  with one exception: a periodic check for new versions, at most once a day, against
  GitHub's API. It can be switched off, and sends nothing about you. See
  [Version check](#version-check).
- No analytics. No external requests other than the version check above.
- The site's right-click/download protection is left untouched; the extension only
  lays a CSS blur over the elements that display pictures.

## If it stops working

The extension depends on diversia's page markup. If the site changes, these are the
places to look (`content.js`, `blur.css`):

| What | Selector |
|---|---|
| Thumbnail | `a[href*="bild="]` with a background style or an `<img>` inside |
| Main picture | the `img.picshadow` that is *not* inside a `bild=` link (sidebar thumbnails share the class) |
| Tags on an image page | `a[href*="/pic/?tag="]` in the same `.row` as the main picture |
| Full tag list | `.gcats2 a[href*="tag="]` on gallery pages |

Issues and pull requests are welcome.

## Development

No build step to run the code: edit the files and reload the extension in
`chrome://extensions`. The repository root is a valid Chrome extension.

```bash
npm run build   # dist/{chrome,firefox,safari} + one zip per browser
npm test        # the packages are complete, and the code runs in all three
```

The tests need nothing but Node: they check that every package contains what its
manifest refers to, that the manifests have the right shape per browser, and that
the code uses the `browser`/`chrome` shim rather than `chrome.*` directly.

| File | What it does |
|---|---|
| `content.js` | Finds thumbnails and main pictures, looks up tags and blurs |
| `blur.css` | The overlay, the tag labels and how a revealed picture looks |
| `options.html`, `options.js` | The panel: tag list, own tags, blur, language, version check |
| `i18n.js` | Swedish and English strings, shared by the panel and the page |
| `tags.json` | The bundled tag list, before it's refreshed from the site |
| `scripts/build.mjs` | Per-browser manifests and packages |
| `test/build.test.mjs` | The three packages are complete and shaped right |
| `test/shim.test.mjs` | Nothing is Chrome-only: no callbacks to `storage`, no `lastError` |

### How it runs in three browsers

The code uses only APIs Chrome, Firefox and Safari all have, through
`globalThis.browser || globalThis.chrome`. Calls to `storage` are written as
promises, because `browser.storage` in Firefox and Safari ignores a callback, which
would then never run. The Firefox package lints clean under Mozilla's own
`web-ext lint`.

**Firefox and Safari are built and packaged but not yet tried in those browsers.**
What is verified is the shape of the packages and that no Chrome-only calls remain.

## License

[MIT](LICENSE). Not affiliated with or endorsed by diversia.social.
