import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import youtube from "../server/sources/youtube"
import { myFetch } from "../server/utils/fetch"
import { isCurrentYouTubeCache, parseYouTubeVideos, selectYouTubeVideos } from "../server/utils/youtube-videos"

vi.mock("../server/utils/fetch", () => ({ myFetch: vi.fn() }))
const now = Date.parse("2026-10-24T12:00:00Z")
function video(id: string, age = "2d ago", views = "1,234 views") {
  return { videoRenderer: {
    videoId: id,
    title: { runs: [{ text: "Original video &amp; title" }] },
    publishedTimeText: { simpleText: age },
    viewCountText: { simpleText: views },
  } }
}
function page(entries: unknown[], labels = ["Videos", "This week", "Popularity"]) {
  const data = {
    header: { searchHeaderRenderer: { searchFilterButton: { buttonRenderer: { command: { openPopupAction: { popup: { searchFilterOptionsDialogRenderer: { groups: [{ searchFilterGroupRenderer: { filters: labels.map(label => ({ searchFilterRenderer: { label: { simpleText: label }, status: "FILTER_STATUS_SELECTED" } })) } }] } } } } } } } },
    contents: { twoColumnSearchResultsRenderer: { primaryContents: { sectionListRenderer: { contents: [{ itemSectionRenderer: { contents: entries } }] } } } },
  }
  return `<script>var ytInitialData = ${JSON.stringify(data)};</script>`
}

describe("youTube seven-day video recommendations", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    vi.mocked(myFetch).mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it("keeps real video IDs, counts and titles, excluding uncertain ages, live content, ads and older videos", () => {
    const live = video("livevideo01")
    Object.assign(live.videoRenderer, { badges: [{ metadataBadgeRenderer: { style: "BADGE_STYLE_TYPE_LIVE_NOW" } }] })
    const items = parseYouTubeVideos(page([
      video("abcdefghijk"),
      video("abcdefghijk"),
      video("oldvideo001", "8 days ago"),
      video("border00001", "6d ago"),
      video("unknown0001", "1 week ago"),
      video("shortview01", "1h ago", "1.2M views"),
      video("invalid"),
      live,
      { adSlotRenderer: { videoRenderer: video("advert00001").videoRenderer } },
    ]), now)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ id: "abcdefghijk", title: "Original video & title", url: "https://www.youtube.com/watch?v=abcdefghijk", extra: { info: "7-day video picks · 1,234 views · Uploaded 2d ago", youtube: { views: 1234, expiresAt: now + 4 * 86400000 } } })
    expect(items[0].pubDate).toBeUndefined()
    expect(() => parseYouTubeVideos(page([video("abcdefghijk")], ["Videos", "Popularity"]))).toThrow("filters unavailable")
    expect(() => parseYouTubeVideos("<h1>Consent required</h1>")).toThrow("search unavailable")
  })

  it("sorts and deduplicates the topic samples by actual views, capped at ten", () => {
    const entries = Array.from({ length: 15 }, (_, index) => video(`vid${String(index).padStart(8, "0")}`, "3h ago", `${index + 1} views`))
    const items = parseYouTubeVideos(page(entries))
    const selected = selectYouTubeVideos([...items, ...items])
    expect(selected).toHaveLength(10)
    expect(selected.map(item => item.extra?.youtube?.views)).toEqual([15, 14, 13, 12, 11, 10, 9, 8, 7, 6])
  })

  it("continues after a topic failure and never replaces videos with official announcements", async () => {
    vi.mocked(myFetch).mockRejectedValueOnce(new Error("One topic unavailable")).mockResolvedValue(page([video("abcdefghijk")]))
    expect(await youtube()).toHaveLength(1)
    for (const call of vi.mocked(myFetch).mock.calls) {
      const url = new URL(call[0].toString())
      expect(url.hostname).toBe("www.youtube.com")
      expect(url.searchParams.get("sp")).toBe("CAMSBAgDEAE=")
    }
    vi.mocked(myFetch).mockRejectedValue(new Error("YouTube unavailable"))
    await expect(youtube()).rejects.toThrow("No valid public platform content")
  })

  it("rejects legacy announcements and expired video caches without affecting other sources", () => {
    const items = parseYouTubeVideos(page([video("abcdefghijk")]))
    expect(isCurrentYouTubeCache({ id: "youtube", items }, now)).toBe(true)
    expect(isCurrentYouTubeCache({ id: "youtube", items }, now + 4 * 86400000)).toBe(false)
    expect(isCurrentYouTubeCache({ id: "youtube", items: [{ id: "blog", title: "Announcement", url: "https://blog.youtube/news/" }] }, now)).toBe(false)
    expect(isCurrentYouTubeCache({ id: "cnn", items: [] }, now)).toBe(true)
  })
})
