import assert from "node:assert/strict"
import process from "node:process"
import { load } from "cheerio"
import { pageCopy, pageForPath, publicPaths } from "../shared/seo"

// Run against a started production preview, not Vite's development fallback.
const base = process.argv[2] ?? "http://127.0.0.1:4173"
for (const path of [...publicPaths, "/c/focus", "/newsnow-seo-missing-page", "/c/invalid-column"]) {
  const response = await fetch(new URL(path, base))
  const page = pageForPath(path)
  const $ = load(await response.text())
  assert.equal(response.status, page === "notFound" ? 404 : 200, `${path}: HTTP status`)
  assert.equal($("title").text(), pageCopy[page].title, `${path}: title`)
  assert.equal($("main h1").length, 1, `${path}: single H1`)
  assert.equal($("meta[name='description']").attr("content"), pageCopy[page].description, `${path}: description`)
  assert.equal($("meta[property='og:title']").attr("content"), pageCopy[page].title, `${path}: share title`)
  assert.ok(!$.html().includes("newsnow.busiyi.world"), `${path}: no template-owner domain`)
  if (page === "focus" || page === "notFound") assert.ok($("meta[name='robots']").attr("content")?.includes("noindex"))
  console.log(`${response.status} ${path}: title, description, H1 and robots verified`)
}
const home = load(await (await fetch(new URL("/", base))).text())
const entry = home("script[type='module'][src]").attr("src")
assert.ok(entry, "built entry script")
const asset = await fetch(new URL(entry, base), { headers: { "Accept-Encoding": "br, gzip" } })
assert.equal(asset.status, 200)
assert.ok(asset.headers.get("cache-control")?.includes("immutable"), "hashed assets have immutable cache headers")
assert.ok(["br", "gzip"].includes(asset.headers.get("content-encoding") ?? ""), "production serves precompressed assets")
console.log(`Entry script: ${asset.headers.get("content-length")} bytes transferred with ${asset.headers.get("content-encoding")}`)
const robots = await (await fetch(new URL("/robots.txt", base))).text()
assert.ok(robots.includes("Disallow: /api/"))
console.log("Hashed asset caching and robots.txt verified")
