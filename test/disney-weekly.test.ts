import { beforeEach, describe, expect, it, vi } from "vitest"
import { DISNEY_CHART, isCurrentDisneyCache, parseDisneyWeekly } from "../server/utils/disney-weekly"
import { parsePeacockWeekly } from "../server/utils/peacock-weekly"
import disneyplus from "../server/sources/disneyplus"
import { myFetch } from "../server/utils/fetch"

vi.mock("../server/utils/fetch", () => ({ myFetch: vi.fn() }))
const fetchMock = vi.mocked(myFetch)
const now = Date.parse("2026-10-24T12:00:00Z")
function chart(period = "12 October - 18 October 2026", name = "Disney+") {
  const entries = [
    { position: 9, item: { "@type": "TVSeries", "name": "Ninth program", "url": "https://www.showlabs.tv/en/title/9-ninth" } },
    { position: 1, item: { "@type": "TVSeries", "name": "First program", "url": "https://www.showlabs.tv/en/title/1-first" } },
    { position: 8, item: { "@type": "Movie", "name": "Movie", "url": "https://www.showlabs.tv/en/title/8-movie" } },
    { position: 5, item: { "@type": "TVSeries", "name": "External", "url": "https://evil.example/title/5-external" } },
  ]
  return `<h1>Top 10 ${name} United States${period}</h1><script type="application/ld+json">${JSON.stringify({ "@graph": [{ "@type": "ItemList", "name": `${name} Top 10 United States`, "itemListElement": entries }] })}</script>`
}

describe("disney+ weekly program recommendations", () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it("filters movies and external URLs, preserves original ranks and dates without inventing counts", () => {
    const items = parseDisneyWeekly(chart(), now)
    expect(items.map(item => item.title)).toEqual(["First program", "Ninth program"])
    expect(items[1].extra).toEqual({ disneyplus: { kind: "weekly", rank: 9, start: Date.parse("2026-10-12Z"), end: Date.parse("2026-10-19Z") }, info: "Showlabs US weekly · Rank #9 · 2026-10-12 to 2026-10-18" })
    expect(items[0].extra?.peacock).toBeUndefined()
    expect(items[0].pubDate).toBeUndefined()
  })

  it("never mixes Disney+ and Peacock headings or metadata", () => {
    expect(() => parseDisneyWeekly(chart(undefined, "Peacock"), now)).toThrow()
    expect(() => parsePeacockWeekly(chart(), now)).toThrow()
    expect(() => parseDisneyWeekly(chart().replace("\"name\":\"Disney+ Top 10 United States\"", "\"name\":\"Peacock Top 10 United States\""), now)).toThrow()
  })

  it.each(["1 October - 31 October 2026", "1 September - 7 September 2026", "26 October - 1 November 2026"])("rejects nonweekly, stale or future chart %s", (period) => {
    expect(() => parseDisneyWeekly(chart(period), now)).toThrow()
  })

  it("invalidates legacy press releases and expired chart caches", () => {
    const items = parseDisneyWeekly(chart(), now)
    expect(isCurrentDisneyCache({ id: "disneyplus", items }, now)).toBe(true)
    expect(isCurrentDisneyCache({ id: "disneyplus", items }, now + 15 * 86400000)).toBe(false)
    expect(isCurrentDisneyCache({ id: "disneyplus", items: [{ id: "old", title: "Old release", url: "https://press.disneyplus.com/news/old" }] }, now)).toBe(false)
    expect(isCurrentDisneyCache({ id: "peacock", items: [] }, now)).toBe(true)
  })

  it("fetches the public Disney+ weekly chart first", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    try {
      fetchMock.mockResolvedValueOnce(chart())
      expect((await disneyplus())[0].extra?.disneyplus?.kind).toBe("weekly")
      expect(fetchMock.mock.calls[0][0]).toBe(DISNEY_CHART)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it("labels official releases when a weekly chart is unavailable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Chart unavailable")).mockResolvedValueOnce("<a href=\"https://press.disneyplus.com/news/new-show\"><h2>Official announcement</h2></a>")
    const items = await disneyplus()
    expect(items[0]).toMatchObject({ title: "Official announcement", extra: { info: "Official updates", disneyplus: { kind: "official" } } })
    expect(isCurrentDisneyCache({ id: "disneyplus", items }, now)).toBe(true)
  })

  it("uses labeled official aggregation if both direct sources fail", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Chart unavailable")).mockRejectedValueOnce(new Error("Press page unavailable")).mockResolvedValueOnce("<rss><channel><item><title>Official news</title><link>https://news.google.com/rss/articles/news</link><source url=\"https://press.disneyplus.com\">Disney+</source><pubDate>Tue, 20 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>")
    const items = await disneyplus()
    expect(items[0].extra?.disneyplus?.kind).toBe("official")
    expect(items[0].extra?.info).toContain("Official updates")
    expect(isCurrentDisneyCache({ id: "disneyplus", items }, now)).toBe(true)
  })
})
