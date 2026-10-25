import { beforeEach, describe, expect, it, vi } from "vitest"
import { isCurrentParamountCache, matchWikipediaShows, parseDailyViews, parseParamountShows, selectParamountRisers } from "../server/utils/paramount-risers"
import paramountplus from "../server/sources/paramountplus"
import { myFetch } from "../server/utils/fetch"

vi.mock("../server/utils/fetch", () => ({ myFetch: vi.fn() }))
const fetchMock = vi.mocked(myFetch)
const DAY = 86400000
const now = Date.parse("2026-10-24T12:00:00Z")
const end = Date.parse("2026-10-23T00:00:00Z")
const show = { title: "Tulsa King", url: "https://www.paramountpressexpress.com/paramount-plus/shows/tulsa-king/", article: "Tulsa King" }
const series = (previous = 10, current = 20) => Array.from({ length: 14 }, (_, index) => ({ date: end - (13 - index) * DAY, views: index < 7 ? previous : current }))
const payload = (days = series()) => ({ items: days.map(day => ({ project: "en.wikipedia", access: "all-access", agent: "user", granularity: "daily", timestamp: `${new Date(day.date).toISOString().slice(0, 10).replaceAll("-", "")}00`, views: day.views })) })

describe("paramount+ public attention risers", () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it("uses official program identities and excludes external/catalog/release links", () => {
    const shows = parseParamountShows(`<a href="/paramount-plus/shows/tulsa-king/"><img alt="Tulsa King"></a>
      <a href="/paramount-plus/shows/tulsa-king">Tulsa King</a><a href="/paramount-plus/shows/">Directory</a>
      <a href="https://evil.example/paramount-plus/shows/other">Other</a><a href="/paramount-plus/shows/show/releases/">News</a>`)
    expect(shows).toEqual([{ title: show.title, url: show.url }])
    const data = { query: { pages: {
      a: { ns: 0, title: "Tulsa King", description: "American crime television series" },
      b: { ns: 0, title: "Tulsa King (TV series)", description: "Upcoming television series" },
      c: { ns: 0, title: "Tulsa King", description: "Disambiguation", pageprops: { disambiguation: "" } },
      d: { ns: 0, title: "Unrelated", description: "American television series" },
    } } }
    expect(matchWikipediaShows(data, shows)).toEqual([show])
  })

  it("requires complete user-only daily measurements and sorts by percentage growth", () => {
    const data = payload()
    data.items.push({ ...data.items[0], views: -1 }, { ...data.items[0], agent: "spider", views: 10000 }, { ...data.items[0], timestamp: "2026102400", views: 9999 })
    expect(parseDailyViews(data, now)).toEqual(series())
    const items = selectParamountRisers([
      { show, days: parseDailyViews(data, now) },
      { show: { ...show, title: "Faster", url: `${show.url}faster` }, days: series(5, 20) },
      { show: { ...show, title: "Incomplete" }, days: series().slice(1) },
      { show: { ...show, title: "Zero baseline" }, days: series(0, 30) },
      { show: { ...show, title: "Declining" }, days: series(20, 10) },
    ], now)
    expect(items.map(item => item.title)).toEqual(["Faster", "Tulsa King"])
    expect(items[1].extra?.paramount).toMatchObject({ previous: 70, current: 140, growth: 100 })
    expect(items[1].extra?.info).toBe("Wikipedia attention · +100.0% vs previous 7 days · 140 page views · 2026-10-17 to 2026-10-23 UTC")
    expect(selectParamountRisers([{ show, days: series().map(day => ({ ...day, date: day.date - 3 * DAY })) }], now)).toEqual([])
  })

  it("compares every program over the same complete dates, rejects legacy and stale caches", () => {
    const complete = { show, days: series() }
    const lagged = { show: { ...show, title: "Lagged" }, days: series().map(day => ({ ...day, date: day.date - DAY })) }
    const items = selectParamountRisers([complete, lagged], now)
    expect(items).toHaveLength(1)
    expect(isCurrentParamountCache({ id: "paramountplus", items }, now)).toBe(true)
    expect(isCurrentParamountCache({ id: "paramountplus", items }, now + 3 * DAY)).toBe(false)
    expect(isCurrentParamountCache({ id: "paramountplus", items: [{ id: "old", title: "Old news", url: show.url }] }, now)).toBe(false)
    expect(isCurrentParamountCache({ id: "unrelated", items: [] }, now)).toBe(true)
  })

  it("fetches official candidates and real Wikimedia comparisons instead of release headlines", async () => {
    const realNow = Date.now()
    const shift = Math.floor(realNow / DAY) * DAY - Math.floor(now / DAY) * DAY
    const measurements = payload(series().map(day => ({ ...day, date: day.date + shift })))
    expect(selectParamountRisers([{ show, days: parseDailyViews(measurements, realNow) }], realNow)).toHaveLength(1)
    fetchMock.mockImplementation(async (url) => {
      const value = String(url)
      if (value.includes("/shows/")) return `<a href="${show.url}">${show.title}</a>`
      if (value.includes("w/api.php")) return { query: { pages: { 1: { ns: 0, title: show.article, description: "American crime television series" } } } }
      if (value.includes("metrics/pageviews/")) return measurements
      throw new Error(`Unexpected request: ${value}`)
    })
    const items = await paramountplus()
    expect(items[0]).toMatchObject({ title: show.title, url: show.url, extra: { paramount: { kind: "riser", growth: 100 } } })
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/releases/"))).toBe(false)
  })

  it("falls back to explicitly labeled official news when comparison data is unavailable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Catalog unavailable")).mockResolvedValueOnce(`<a class="release-link" href="/paramount-plus/releases/?view=123-new"><h4 class="release-title">Official news</h4></a>`)
    const items = await paramountplus()
    expect(items[0]).toMatchObject({ title: "Official news", extra: { info: "Official updates", paramount: { kind: "official" } } })
    expect(isCurrentParamountCache({ id: "paramountplus", items }, now)).toBe(true)
  })
})
