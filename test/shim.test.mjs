// The source has to run in Firefox and Safari as well as Chrome.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SOURCES = ['content.js', 'options.js', 'i18n.js'];

test('the browser/chrome shim is used, never chrome.* directly', () => {
  for (const f of SOURCES) {
    const src = readFileSync(f, 'utf8');
    assert.doesNotMatch(src, /(^|[^.\w])chrome\.(storage|runtime|action|tabs|scripting|i18n)/m, f);
  }
  for (const f of ['content.js', 'options.js']) {
    assert.match(readFileSync(f, 'utf8'), /globalThis\.browser \|\| globalThis\.chrome/, f);
  }
});

// Everything between a call's own parentheses, so that a .then() chained
// after it isn't mistaken for an argument.
function argsOf(src, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < src.length; i++) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')') { depth--; if (depth === 0) return src.slice(openIndex + 1, i); }
  }
  return '';
}

test('storage is called with promises, not Chrome-only callbacks', () => {
  // browser.storage.* in Firefox and Safari returns a promise and ignores a
  // callback argument, so a trailing function would silently never run.
  const call = /ext\.storage\.(?:local|sync)\.(?:get|set|remove|clear)\(/g;
  for (const f of ['content.js', 'options.js']) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(call)) {
      const args = argsOf(src, m.index + m[0].length - 1);
      assert.doesNotMatch(args, /=>|\bfunction\b/, `${f}: callback passed to ${m[0]}…)`);
    }
  }
});

test('runtime.lastError is not relied on (it is Chrome callback-style)', () => {
  for (const f of SOURCES) {
    assert.doesNotMatch(readFileSync(f, 'utf8'), /lastError/, f);
  }
});
