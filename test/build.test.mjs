// The per-browser packages are complete and have the right manifest shape.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { build, GECKO_ID } from '../scripts/build.mjs';

let zips;
before(() => { zips = build(); });
const manifest = (t) => JSON.parse(readFileSync(`dist/${t}/manifest.json`, 'utf8'));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const TARGETS = ['chrome', 'firefox', 'safari'];

test('one zip per browser, versions in sync', () => {
  assert.equal(zips.length, 3);
  for (const z of zips) assert.ok(existsSync(z), z);
  for (const t of TARGETS) assert.equal(manifest(t).version, pkg.version);
});

test('every referenced file exists in every package', () => {
  for (const t of TARGETS) {
    const m = manifest(t);
    const files = [
      ...m.content_scripts.flatMap((c) => [...(c.js || []), ...(c.css || [])]),
      ...Object.values(m.icons),
      m.options_ui.page,
      m.action.default_popup,
    ];
    for (const f of files) assert.ok(existsSync(`dist/${t}/${f}`), `${t}: ${f}`);
    // the tag list the options page falls back to
    assert.ok(existsSync(`dist/${t}/tags.json`), `${t}: tags.json`);
    // scripts the options page pulls in
    const opts = readFileSync(`dist/${t}/${m.options_ui.page}`, 'utf8');
    for (const [, f] of opts.matchAll(/<script src="([\w.]+\.js)"/g)) {
      assert.ok(existsSync(`dist/${t}/${f}`), `${t}: ${f}`);
    }
  }
});

test('Firefox gets a gecko id and declares no data collection', () => {
  const ff = manifest('firefox');
  assert.equal(ff.browser_specific_settings.gecko.id, GECKO_ID);
  assert.deepEqual(ff.browser_specific_settings.gecko.data_collection_permissions, { required: ['none'] });
  // declaring data_collection_permissions requires 140 (142 on Android);
  // web-ext lint warns if the stated minimum is older than the key it uses
  assert.ok(parseInt(ff.browser_specific_settings.gecko.strict_min_version, 10) >= 140);
  assert.ok(parseInt(ff.browser_specific_settings.gecko_android.strict_min_version, 10) >= 142);
  // Chrome and Safari must not carry Firefox-only keys
  for (const t of ['chrome', 'safari']) assert.equal(manifest(t).browser_specific_settings, undefined, t);
});

test('no extension asks for more than diversia.social', () => {
  for (const t of TARGETS) {
    const m = manifest(t);
    assert.deepEqual(m.permissions, ['storage'], t);
    for (const h of m.host_permissions) assert.match(h, /diversia\.social/, t);
    for (const c of m.content_scripts) for (const mt of c.matches) assert.match(mt, /diversia\.social/, t);
  }
});
