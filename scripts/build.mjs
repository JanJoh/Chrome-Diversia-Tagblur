// Builds one package per browser from the shared source:
//   dist/chrome/   + dist/diversia-tagblur-chrome-<v>.zip   (Chrome, Edge, Brave, Opera, Vivaldi)
//   dist/firefox/  + dist/diversia-tagblur-firefox-<v>.zip  (Firefox desktop and Android)
//   dist/safari/   + dist/diversia-tagblur-safari-<v>.zip   (Safari on macOS, iOS, iPadOS)
// The repository root itself is a valid Chrome extension ("Load unpacked").
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const base = JSON.parse(readFileSync('manifest.json', 'utf8'));
const FILES = ['content.js', 'blur.css', 'options.html', 'options.js', 'i18n.js', 'tags.json', 'LICENSE', 'icons'];
const clone = (o) => JSON.parse(JSON.stringify(o));

export const GECKO_ID = 'diversia-tagblur@extensions';

export function manifestFor(target) {
  const m = clone(base);
  if (target === 'firefox') {
    m.browser_specific_settings = {
      gecko: {
        id: GECKO_ID,
        // :has() in querySelectorAll, used by the thumbnail selector, needs
        // 121; data_collection_permissions below only exists from 140, and
        // web-ext lint rejects declaring it with a lower minimum.
        strict_min_version: '140.0',
        // the extension collects and sends nothing
        data_collection_permissions: { required: ['none'] },
      },
      // Firefox for Android got the same key two releases later.
      gecko_android: { strict_min_version: '142.0' },
    };
  }
  if (target === 'safari') {
    // Safari takes the Chrome-style MV3 manifest; keep it identical apart from
    // a shorter title for the iOS extensions list.
    m.action.default_title = 'Diversia Tag Blur';
  }
  return m;
}

export function build(targets = ['chrome', 'firefox', 'safari']) {
  rmSync('dist', { recursive: true, force: true });
  const out = [];
  for (const target of targets) {
    const dir = `dist/${target}`;
    mkdirSync(dir, { recursive: true });
    for (const f of FILES) cpSync(f, `${dir}/${f}`, { recursive: true });
    writeFileSync(`${dir}/manifest.json`, JSON.stringify(manifestFor(target), null, 2) + '\n');
    const zip = `diversia-tagblur-${target}-${base.version}.zip`;
    execFileSync('zip', ['-r', '-q', `../${zip}`, '.'], { cwd: dir });
    out.push(`dist/${zip}`);
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const f of build()) console.log('wrote', f);
}
