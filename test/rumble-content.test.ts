import { beforeEach, describe, expect, it, vi } from "vitest"
import rumble from "../server/sources/rumble"
import { myFetch } from "../server/utils/fetch"
import { isCurrentRumbleCache, parseRumbleDiscovery, parseRumbleVideos, rumbleIndexedPick, rumbleVideoUrl } from "../server/utils/rumble-content"

vi.mock("../server/utils/fetch", () => ({ myFetch: vi.fn() }))
const fetchMock = vi.mocked(myFetch)
const now = Date.parse("2026-10-24T15:00:00Z")
const url = "https://rumble.com/v7abcde-example.html"
function video(overrides = {}) {
  return {
    "@type": "VideoObject",
    "name": "A public video",
    url,
    "uploadDate": "2026-10-23T12:00:00Z",
    "interactionStatistic": { interactionType: { "@type": "WatchAction" }, userInteractionCount: 12345 },
    ...overrides,
  }
}
const page = (videos: unknown[]) => `<script type="application/ld+json">${JSON.stringify({ "@type": "ItemList", "itemListElement": videos })}</script>`
const rss = `<rss><channel><item><title>A public video - Rumble</title><link>https://news.google.com/rss/articles/VALIDID?oc=5</link>
  <pubDate>Fri, 23 Oct 2026 12:00:00 GMT</pubDate><source url="https://rumble.com">Rumble</source></item></channel></rss>`

describe("rumble seven-day recommendations", () => {
  beforeEach(() => fetchMock.mockReset())

  it("accepts canonical public video links and rejects channels, credentials and lookalike hosts", () => {
    expect(rumbleVideoUrl(`${url}?tracking=yes`)).toBe(url)
    for (const value of ["http://rumble.com/v7abcde-example.html", "https://rumble.com.evil.test/v7abcde-example.html", "https://user@rumble.com/v7abcde-example.html", "https://rumble.com/c/news", "https://rumble.com/search/video?q=news"]) expect(rumbleVideoUrl(value)).toBeUndefined()
  })

  it("ranks recent videos by real views, deduplicates and excludes old or unverified dates", () => {
    const items = parseRumbleVideos(page([
      video(),
      video(),
      video({ url: "https://rumble.com/v7bcdef-second.html", interactionStatistic: { interactionType: "https://schema.org/WatchAction", userInteractionCount: 50000 } }),
      video({ uploadDate: "2026-10-16T00:00:00Z" }),
      video({ uploadDate: "2026-10-25T00:00:00Z" }),
      video({ uploadDate: undefined }),
      video({ url: "https://evil.test/v7abcde-example.html" }),
    ]), now)
    expect(items).toHaveLength(2)
    expect(items[0].extra?.rumble?.views).toBe(50000)
    expect(items[1].extra?.info).toContain("12,345 views")
    expect(() => parseRumbleVideos(page([video({ uploadDate: undefined })]), now)).toThrow()
  })

  it("labels index dates honestly without inventing upload dates or popularity counts", () => {
    const discovered = parseRumbleDiscovery(rss, now)
    const item = rumbleIndexedPick(discovered[0], url, now)
    expect(item.extra?.info).toContain("Google News date: 2026-10-23")
    expect(item.extra?.rumble).toMatchObject({ kind: "indexed", date: discovered[0].pubDate })
    expect(item.extra?.rumble?.views).toBeUndefined()
    expect(isCurrentRumbleCache({ id: "rumble", items: [item] }, now + 7 * 86400000)).toBe(false)
  })

  it("ignores legacy official-only cache entries until they have an explicit fallback marker", () => {
    const item = { id: "old", title: "Company announcement", url: "https://www.rum.group/blog/announcement/", extra: { info: "Official company updates" } }
    expect(isCurrentRumbleCache({ id: "rumble", items: [item] }, now)).toBe(false)
    expect(isCurrentRumbleCache({ id: "rumble", items: [{ ...item, extra: { ...item.extra, rumble: { kind: "official" } } }] }, now)).toBe(true)
  })

  it("uses resolved public video recommendations when the Rumble directory is blocked", async () => {
    const date = new Date(Date.now() - 86400000).toUTCString()
    fetchMock.mockRejectedValueOnce(new Error("Directory blocked"))
      .mockResolvedValueOnce(rss.replace("Fri, 23 Oct 2026 12:00:00 GMT", date))
      .mockResolvedValueOnce("<div data-n-a-id=\"VALIDID\" data-n-a-ts=\"12345\" data-n-a-sg=\"signature\"></div>")
      .mockResolvedValueOnce(JSON.stringify([["wrb.fr", "Fbv4je", JSON.stringify(["garturlres", url]), null, null, null, "0"]]))
    const items = await rumble()
    expect(items[0]).toMatchObject({ url, extra: { rumble: { kind: "indexed" } } })
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it("clearly labels official updates when both recommendation channels are unavailable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Directory blocked")).mockRejectedValueOnce(new Error("Discovery unavailable")).mockResolvedValueOnce("<h2><a href=\"/blog/announcement/\">Official announcement</a></h2>")
    const items = await rumble()
    expect(items[0]).toMatchObject({ title: "Official announcement", extra: { info: "Official company updates", rumble: { kind: "official" } } })
  })
})
