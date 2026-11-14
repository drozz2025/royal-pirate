import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('release number is consistent across package, lockfile and visible game UI', () => {
  const pkg = JSON.parse(read('../package.json')) as { version: string };
  const lock = JSON.parse(read('../package-lock.json')) as {
    version: string;
    packages: { '': { version: string } };
  };
  const html = read('../index.html');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.ok(html.includes('<title>ROYAL PIRATE — v' + pkg.version + '</title>'));
  assert.ok(html.includes('aria-label="Game version">v' + pkg.version + '</span>'));
});

test('self-hosted fonts load on both GitHub project Pages and root-hosted preview', () => {
  const html = read('../index.html');
  const css = read('../public/fonts/fonts.css');
  assert.ok(html.includes('href="%BASE_URL%fonts/fonts.css"'),
    'Vite must rewrite the link using the configured site base path');
  assert.ok(!css.includes('url(/fonts/'),
    'root-relative paths break GitHub project Pages');
  assert.match(css, /url\(\.\/font-0\.ttf\)/);
  assert.match(css, /url\(\.\/font-8\.ttf\)/);
});
