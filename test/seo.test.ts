import { readFileSync } from "node:fs"
import { load } from "cheerio"
import { beforeAll, describe, expect, it } from "vitest"
import { renderSeoPage } from "../tools/seo-pages"
import { canonicalPath, localizedPageCopy, pageCopy, pageForPath, pageSources, publicPaths, siteOrigin } from "../shared/seo"
import { languages, loadLocale } from "../shared/i18n"

const template = readFileSync("index.html", "utf8")

describe("crawlable page documents", () => {
  beforeAll(() => Promise.all(languages.map(language => loadLocale(language.code))))
  it("renders distinct route metadata and readable content without JavaScript", () => {
    const titles = new Set<string>()
    for (const path of publicPaths) {
      const page = pageForPath(path)
      const $ = load(renderSeoPage(template, page))
      expect($("h1")).toHaveLength(1)
      expect($("title").text()).toBe(pageCopy[page].title)
      expect($("meta[name='description']").attr("content")).toBe(pageCopy[page].description)
      expect($("main h2").text()).toBe("Explore sources")
      expect($("main li a")).toHaveLength(pageSources(page).length)
      expect($("main li a").first().attr("href")).toMatch(/^https:\/\//)
      expect($("nav a[href='/c/updated']")).toHaveLength(1)
      expect($("link[rel='canonical']")).toHaveLength(0)
      expect($.html()).not.toContain("newsnow.busiyi.world")
      titles.add($("title").text())
    }
    expect(titles.size).toBe(publicPaths.length)
  })

  it("only emits canonical URLs and structured data for a configured domain", () => {
    for (const page of ["home", "hottest", "updated", "realtime"] as const) {
      const $ = load(renderSeoPage(template, page, "https://example.test"))
      const canonical = `https://example.test${canonicalPath(page)}`
      expect($("link[rel='canonical']").attr("href")).toBe(canonical)
      expect($("meta[property='og:url']").attr("content")).toBe(canonical)
      const schema = JSON.parse($("script[type='application/ld+json']").text())
      expect(schema["@type"]).toBe("CollectionPage")
      expect(schema.url).toBe(canonical)
      expect(schema).not.toHaveProperty("aggregateRating")
      expect($("meta[property='og:image']").attr("content")).toBe("https://example.test/og-image.png")
    }
  })

  it("keeps personal lists and missing pages out of the index", () => {
    expect(pageForPath("/missing")).toBe("notFound")
    expect(pageForPath("/c/unknown")).toBe("notFound")
    expect(pageForPath("/c/updated/")).toBe("updated")
    for (const page of ["focus", "notFound"] as const) {
      const $ = load(renderSeoPage(template, page))
      expect($("meta[name='robots']").attr("content")).toBe("noindex, follow")
    }
  })

  it("rejects unsafe or local origins instead of inventing a public domain", () => {
    expect(siteOrigin()).toBeUndefined()
    expect(siteOrigin("https://example.test/")).toBe("https://example.test")
    for (const value of ["javascript:alert(1)", "https://user:pass@example.test/", "https://example.test/path", "http://localhost:4173", "https://example.test/?x=1"]) expect(() => siteOrigin(value)).toThrow()
  })

  it("keeps headings and metadata localized in all twelve languages", () => {
    for (const { code } of languages) {
      const copy = localizedPageCopy("updated", code)
      expect(copy.heading).toBeTruthy()
      expect(copy.description).toBeTruthy()
      if (code !== "en") expect(copy.heading).not.toBe(pageCopy.updated.heading)
      expect(copy.title).toContain("NewsNow")
    }
  })
})
