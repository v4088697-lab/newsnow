import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import facebook from "../server/sources/facebook"
import { myFetch } from "../server/utils/fetch"
import { facebookPostIdentity, isCurrentFacebookCache, parseFacebookDiscovery, parseFacebookPage, selectFacebookPosts } from "../server/utils/facebook-posts"

vi.mock("../server/utils/fetch", () => ({ myFetch: vi.fn() }))
const now = Date.parse("2026-10-24T12:00:00Z")
const indexedAt = now - 86400000
const url = "https://www.facebook.com/reel/1234567890/"
const article = "https://news.google.com/rss/articles/CBMifacebook?oc=5"
const discovery = { id: article, url: article, title: "1M views · 2K reactions | Original video caption", pubDate: indexedAt }
function page(canonical = "https://www.facebook.com/creator/videos/original-caption/1234567890/", title = "65K views · 4.3K reactions | Original video caption | Creator", image = "https://scontent.xx.fbcdn.net/photo.jpg") {
  return `<meta property="og:url" content="${canonical}"><meta property="og:title" content="${title}"><meta property="og:image" content="${image}">`
}
function feed(publisher = "https://www.facebook.com", date = indexedAt) {
  return `<rss><channel><item><title>Original caption - Facebook</title><link>${article}</link><source url="${publisher}">Facebook</source><pubDate>${new Date(date).toUTCString()}</pubDate></item></channel></rss>`
}

describe("facebook seven-day public recommendations", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    vi.mocked(myFetch).mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it("accepts actual video and post permalinks while rejecting profiles, groups, lookalike domains and login pages", () => {
    expect(facebookPostIdentity(`${url}?tracking=foo`)).toEqual({ id: "1234567890", kind: "Video", url })
    expect(facebookPostIdentity("https://facebook.com/watch/?v=1234567890")).toMatchObject({ id: "1234567890", kind: "Video" })
    expect(facebookPostIdentity("https://www.facebook.com/page/posts/caption/1234567890/")).toMatchObject({ id: "1234567890", kind: "Post" })
    expect(facebookPostIdentity("https://www.facebook.com/photo.php?fbid=1234567890&tracking=foo")?.url).toBe("https://www.facebook.com/photo.php?fbid=1234567890")
    expect(facebookPostIdentity("https://www.facebook.com/permalink.php?story_fbid=1234567890&id=9876543210")).toMatchObject({ id: "1234567890" })
    for (const value of ["https://www.facebook.com/creator/", "https://www.facebook.com/groups/123/posts/1234567890/", "https://facebook.com.evil.example/reel/1234567890/", "http://www.facebook.com/reel/1234567890/", "https://www.facebook.com/login/", "https://www.facebook.com/watch/"]) expect(facebookPostIdentity(value)).toBeUndefined()
  })

  it("accepts only verified Facebook publishers with index dates inside the seven-day window", () => {
    expect(parseFacebookDiscovery(feed())).toMatchObject([{ title: "Original caption", pubDate: indexedAt }])
    expect(() => parseFacebookDiscovery(feed("https://unrelated.example"))).toThrow()
    expect(parseFacebookDiscovery(feed(undefined, now - 7 * 86400000))).toEqual([])
    expect(parseFacebookDiscovery(feed(undefined, now + 1000))).toEqual([])
    expect(parseFacebookDiscovery(feed().replace(/<pubDate>[^<]+<\/pubDate>/, ""))).toEqual([])
  })

  it("uses public page counters, retains rounded labels and removes older indexed counters from titles", () => {
    const item = parseFacebookPage(page(), url, discovery)
    expect(item).toMatchObject({ id: "1234567890", title: "Original video caption", url, extra: { image: "https://scontent.xx.fbcdn.net/photo.jpg", facebook: { indexedAt, reactions: 4300, views: 65000 }, info: "7-day indexed picks · Video · 4.3K reactions · 65K views · Google News date: 2026-10-23" } })
    expect(item.pubDate).toBeUndefined()
    expect(() => parseFacebookPage(page("https://www.facebook.com/reel/9999999999/"), url, discovery)).toThrow("post unavailable")
    expect(() => parseFacebookPage(page(undefined, undefined, "https://evil.example/image.jpg"), url, discovery)).toThrow("image unavailable")
    expect(() => parseFacebookPage(page(undefined, "A video without metrics"), url, discovery)).toThrow("metrics unavailable")
    expect(() => parseFacebookPage(page(), url, { ...discovery, pubDate: now - 7 * 86400000 })).toThrow("discovery window")
  })

  it("keeps unmeasured public photo/posts explicitly labeled as recommendations", () => {
    const postUrl = "https://www.facebook.com/creator/posts/1234567890/"
    const item = parseFacebookPage(page(postUrl, "Creator"), postUrl, { ...discovery, title: "An original photo caption" })
    expect(item.title).toBe("Creator — An original photo caption")
    expect(item.extra?.info).toBe("7-day indexed picks · Public post pick · Google News date: 2026-10-23")
    expect(item.extra?.facebook?.reactions).toBeUndefined()
    expect(item.extra?.facebook?.views).toBeUndefined()
  })

  it("compares compatible metrics, then shows recent unmeasured posts without inventing popularity scores", () => {
    const reaction = parseFacebookPage(page(), url, discovery)
    const views = parseFacebookPage(page("https://www.facebook.com/reel/1234567891/", "10M views | Video"), "https://www.facebook.com/reel/1234567891/", discovery)
    const post = parseFacebookPage(page("https://www.facebook.com/creator/posts/1234567892/", "Creator"), "https://www.facebook.com/creator/posts/1234567892/", discovery)
    expect(selectFacebookPosts([post, views, reaction, reaction]).map(item => item.id)).toEqual(["1234567890", "1234567891", "1234567892"])
    expect(selectFacebookPosts(Array.from({ length: 12 }, (_, index) => ({ ...reaction, id: String(index) })))).toHaveLength(10)
  })

  it("fetches only resolved public pages and never substitutes company news", async () => {
    vi.mocked(myFetch).mockImplementation(async (input) => {
      const value = input.toString()
      if (value.includes("/rss/search?")) return feed() as any
      if (value === article) return "<div data-n-a-id=\"CBMifacebook\" data-n-a-ts=\"1792830000\" data-n-a-sg=\"abc-123\"></div>" as any
      if (value.includes("batchexecute")) return `)]}'\n${JSON.stringify([["wrb.fr", "Fbv4je", JSON.stringify(["garturlres", url, 1]), null, null, null, "0"]])}` as any
      if (value === url) return page() as any
      throw new Error("Unexpected URL")
    })
    expect(await facebook()).toMatchObject([{ url, extra: { facebook: { reactions: 4300, views: 65000 } } }])
    expect(vi.mocked(myFetch).mock.calls.every(call => !call[0].toString().includes("about.fb.com"))).toBe(true)
    vi.mocked(myFetch).mockRejectedValue(new Error("Unavailable"))
    await expect(facebook()).rejects.toThrow("recommendations unavailable")
  })

  it("rejects company-news cache and seven-day expired items while preserving other sources", () => {
    const items = [parseFacebookPage(page(), url, discovery)]
    expect(isCurrentFacebookCache({ id: "facebook", items })).toBe(true)
    expect(isCurrentFacebookCache({ id: "facebook", items }, indexedAt + 7 * 86400000)).toBe(false)
    expect(isCurrentFacebookCache({ id: "facebook", items: [{ id: "blog", title: "Company update", url: "https://about.fb.com/news/" }] })).toBe(false)
    expect(isCurrentFacebookCache({ id: "cnn", items: [] })).toBe(true)
  })
})
