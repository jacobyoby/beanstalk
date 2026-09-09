import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const dist = resolve('dist')
const base = '/beanstalk/'
const demo = process.argv.includes('--demo')
const html = await readFile(resolve(dist, 'index.html'), 'utf8')
assert.match(html, /<title>beanstalk<\/title>/)
for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if (/^(https?:|data:|#)/.test(url)) continue
  assert.ok(url.startsWith(base), `Asset escapes the project path: ${url}`)
  assert.ok((await stat(resolve(dist, url.slice(base.length)))).isFile(), `Missing asset: ${url}`)
}

const manifest = JSON.parse(await readFile(resolve(dist, 'manifest.webmanifest'), 'utf8'))
assert.equal(manifest.name, demo ? 'beanstalk demo' : 'beanstalk')
assert.equal(manifest.start_url, base)
assert.equal(manifest.scope, base)
for (const icon of manifest.icons) {
  const url = new URL(icon.src, `https://jacobyoby.github.io${base}manifest.webmanifest`)
  assert.ok(url.pathname.startsWith(base), `Icon escapes the project path: ${icon.src}`)
  await stat(resolve(dist, url.pathname.slice(base.length)))
}
const registration = await readFile(resolve(dist, 'registerSW.js'), 'utf8')
assert.ok(registration.includes(`${base}sw.js`), 'Service worker URL escapes the project')
assert.match(registration, /scope:\s*["']\/beanstalk\/["']/)

async function inspect(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, item.name)
    assert.ok(!item.isSymbolicLink(), `Symlink in deployment: ${item.name}`)
    assert.ok(!item.name.startsWith('.env'), 'Environment file in deployment')
    if (item.isDirectory()) { await inspect(path); continue }
    const text = await readFile(path, 'utf8')
    assert.ok(!text.includes('BEANSTALK_BUILD_SECRET_SENTINEL'), 'Hosted build exposed the build-time owner-key sentinel')
    if (/\.(html|js|svg|webmanifest)$/.test(item.name)) {
      assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(text), `Emoji in deployed file: ${item.name}`)
    }
  }
}
await inspect(dist)
console.log('Hosted artifact verified: subpath assets, manifest, service worker, icons, and credential sentinel.')
