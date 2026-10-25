import { beforeEach, describe, expect, it, vi } from "vitest"
import { PEACOCK_CHART, isCurrentPeacockCache, parsePeacockWeekly } from "../server/utils/peacock-weekly"
import peacock from "../server/sources/peacock"
import { myFetch } from "../server/utils/fetch"

vi.mock("../server/utils/fetch", () => ({ myFetch: vi.fn() }))
const fetchMock = vi.mocked(myFetch)
const now = Date.parse("2026-10-24T12:00:00Z")
const entry = (rank: number, title: string, type = "TVSeries", url = `https://www.showlabs.tv/en/title/${rank}-show`) => ({ position: rank, item: { "@type": type, "name": title, url } })
function chart(entries = [entry(1, "Popular show"), entry(2, "Another show")], period = "12 October - 18 October 2026") {
  return `<h1>Top 10 Peacock United States${period}</h1><script type="application/ld+json">${JSON.stringify({ "@graph": [{ "@type": "ItemList", "name": "Peacock Top 10 United States", "itemListElement": entries }] })}</script>`
}

describe("peacock seven-day program recommendations", () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it("keeps public TV-series ranks, drops films, duplicates and external URLs without inventing counts", () => {
    const items = parsePeacockWeekly(chart([entry(5, "Fifth"), entry(1, "First"), entry(2, "Film", "Movie"), entry(3, "External", "TVSeries", "https://evil.example/en/title/3-show"), entry(5, "Duplicate"), entry(11, "Outside top ten")]), now)
    expect(items.map(item => item.title)).toEqual(["First", "Fifth"])
    expect(items[1].extra).toEqual({ peacock: { kind: "weekly", rank: 5, start: Date.parse("2026-10-12Z"), end: Date.parse("2026-10-19Z") }, info: "Showlabs US weekly · Rank #5 · 2026-10-12 to 2026-10-18" })
    expect(items[0].pubDate).toBeUndefined()
  })

  it.each(["1 October - 31 October 2026", "1 September - 7 September 2026", "26 October - 1 November 2026", "31 February - 6 March 2026"])("rejects stale, future, monthly or invalid period %s", (period) => {
    expect(() => parsePeacockWeekly(chart(undefined, period), now)).toThrow()
  })

  it("handles cross-year complete weeks and rejects missing or wrong chart metadata", () => {
    const items = parsePeacockWeekly(chart(undefined, "28 December - 3 January 2027"), Date.parse("2027-01-06T12:00:00Z"))
    expect(items[0].extra?.peacock?.start).toBe(Date.parse("2026-12-28Z"))
    expect(() => parsePeacockWeekly(chart().replace("Top 10 Peacock United States", "Top 10 Netflix United States"), now)).toThrow()
    expect(() => parsePeacockWeekly("<h1>Unavailable</h1>", now)).toThrow()
  })

  it("invalidates old blog cards and expired weekly caches while preserving other sources", () => {
    const items = parsePeacockWeekly(chart(), now)
    expect(isCurrentPeacockCache({ id: "peacock", items }, now)).toBe(true)
    expect(isCurrentPeacockCache({ id: "peacock", items }, now + 15 * 86400000)).toBe(false)
    expect(isCurrentPeacockCache({ id: "peacock", items: [{ id: "old", title: "Blog article", url: "https://www.peacocktv.com/blog/old" }] }, now)).toBe(false)
    expect(isCurrentPeacockCache({ id: "cnn", items: [] }, now)).toBe(true)
  })

  it("reads the weekly chart as the primary source", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    try {
      fetchMock.mockResolvedValueOnce(chart())
      expect((await peacock())[0]).toMatchObject({ title: "Popular show", extra: { peacock: { kind: "weekly" } } })
      expect(fetchMock.mock.calls[0][0]).toBe(PEACOCK_CHART)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it("labels fallback blog content as official updates rather than a seven-day ranking", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Chart unavailable")).mockResolvedValueOnce("<a href=\"/blog/new-program\"><div class=\"headline\">New program announcement</div></a>")
    const items = await peacock()
    expect(items[0]).toMatchObject({ title: "New program announcement", extra: { info: "Official updates", peacock: { kind: "official" } } })
    expect(isCurrentPeacockCache({ id: "peacock", items }, now)).toBe(true)
  })
})
