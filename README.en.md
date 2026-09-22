# Diversia Tag Blur

🇸🇪 [Svenska](README.md)

> **GenAI project.** The code, documentation and images in this repository were
> produced with generative AI (Claude). No proofreading or independent review has been
> done. Use at your own discretion.

A Chrome extension that blurs images on [diversia.social](https://diversia.social)
carrying tags you choose. Blurred images show which tags matched; one click
reveals the picture.

![Blurred thumbnails in a gallery and the sidebar](docs/exempel-utsuddning.png)

<sub>Demo page with placeholder pictures. The overlay and labels are the real
extension CSS.</sub>

## Install

The extension is not on the Chrome Web Store; install it unpacked.

> **Chrome Web Store:** I currently have no intention of submitting the extension to the
> Chrome Web Store. Install it using the steps below.

1. Download the latest `Chrome-Diversia-Tagblur-x.y.z.zip` from
   [Releases](https://github.com/JanJoh/Chrome-Diversia-Tagblur/releases) and unzip it
   (or `git clone` this repository).
2. Open `chrome://extensions` and switch on **Developer mode** (top right).
3. Click **Load unpacked** and select the unzipped folder (the one containing
   `manifest.json`).
4. Optional: pin the extension via the puzzle-piece icon in the toolbar.

Works in any Chromium browser that supports Manifest V3 (Chrome, Edge, Brave, Vivaldi).

**Updating:** replace the folder with the new version and press the reload arrow on the
extension's card in `chrome://extensions`.

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

No build step: edit the files and reload the extension in `chrome://extensions`.
`./package.sh` builds a release zip containing only the files the extension needs.

## License

[MIT](LICENSE). Not affiliated with or endorsed by diversia.social.
