import { describe, expect, it } from "vitest"
import { parseNetflixChart } from "../server/utils/netflix-chart"
import { parsePublicLinks, plainText, validPlatformUrl } from "../server/utils/platform-content"
import { parseDailymotion, parseTwitchDirectory, parseYouTubeCharts } from "../server/utils/platform-video"
import { parseXUpdates } from "../server/utils/platform-updates"

describe("public platform content", () => {
  it("accepts only secure publisher domains and preserves readable text", () => {
    expect(validPlatformUrl("https://video.dailymotion.com/video/123", ["dailymotion.com"])).toBe(true)
    expect(validPlatformUrl("https://dailymotion.com.evil.example/video/123", ["dailymotion.com"])).toBe(false)
    expect(validPlatformUrl("http://dailymotion.com/video/123", ["dailymotion.com"])).toBe(false)
    expect(plainText("First<br>Second &amp; Third")).toBe("First Second & Third")
  })

  it("extracts official article headings while rejecting navigation and external links", () => {
    const items = parsePublicLinks(`<a href="/news/one"><h2>First &amp; second</h2>Long description</a>
      <a href="/news/one"><h2>Duplicate</h2></a><a href="/news/"><h2>Navigation</h2></a>
      <a href="https://evil.example/news/two"><h2>External</h2></a><a href="/news/three">No heading</a>`, {
      base: "https://official.example/news/",
      selector: "a",
      titleSelector: "h2",
      path: /^\/news\/[^/]+$/,
      label: "Official updates",
    })
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ title: "First & second", url: "https://official.example/news/one", extra: { info: "Official updates" } })
    expect(() => parsePublicLinks("<h1>Access denied</h1>", { base: "https://official.example", selector: "a", path: /./, label: "Official updates" })).toThrow()
  })

  it("filters invalid Dailymotion videos and preserves real counts", () => {
    const items = parseDailymotion({ list: [
      { id: "abc123", title: "Real video", url: "https://www.dailymotion.com/video/abc123", views_total: 12345, created_time: 100 },
      { id: "abc123", title: "Duplicate", url: "https://www.dailymotion.com/video/abc123" },
      { id: "bad", title: "Wrong host", url: "https://evil.example/video/bad" },
    ] })
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ pubDate: 100000, extra: { info: "Popular videos · 12,345 views" } })
    expect(() => parseDailymotion({ list: [] })).toThrow()
  })

  it("keeps YouTube chart provenance and excludes unavailable videos", () => {
    const items = parseYouTubeCharts({ contents: { sectionListRenderer: { contents: [{ musicAnalyticsSectionRenderer: { content: {
      perspectiveMetadata: { availableChartsInfo: [{ chartType: "CHART_TYPE_VIDEOS", chartPeriodType: "CHART_PERIOD_TYPE_WEEKLY", latestEndDate: "2026-10-15" }] },
      videos: [{ videoViews: [
        { id: "abcdefghijk", title: "A music video", chartEntryMetadata: { currentPosition: 7 } },
        { id: "lmnopqrstuv", title: "Unavailable", isAvailable: false },
        { id: "invalid", title: "Invalid ID" },
      ] }],
    } } }] } } })
    expect(items).toHaveLength(1)
    expect(items[0].extra?.info).toBe("US weekly music video chart · Rank #7 · 2026-10-15")
    expect(items[0].url).toBe("https://www.youtube.com/watch?v=abcdefghijk")
  })

  it("sorts Twitch categories by current viewers and rejects invalid slugs", () => {
    const items = parseTwitchDirectory({ data: { games: { edges: [
      { node: { id: "1", name: "Small", slug: "small", viewersCount: 20 } },
      { node: { id: "2", name: "Large", slug: "large", viewersCount: 5000 } },
      { node: { id: "3", name: "Invalid", slug: "../invalid", viewersCount: 9000 } },
    ] } } })
    expect(items.map(item => item.title)).toEqual(["Large", "Small"])
    expect(items[0].extra?.info).toBe("Popular live categories · 5,000 viewers")
  })

  it("labels X change log entries as developer updates", () => {
    expect(parseXUpdates("<h3 id=\"october-2026\">October 2026<br>API changes</h3>")[0]).toMatchObject({
      title: "October 2026 API changes",
      url: "https://docs.x.com/changelog#october-2026",
      extra: { info: "Official developer updates" },
    })
  })
})

describe("netflix official weekly chart", () => {
  const header = "week\tcategory\tweekly_rank\tshow_title\tseason_title\tweekly_views"
  const completeWeek = Array.from({ length: 10 }, (_, index) => `2026-10-11\tTV (English)\t${index + 1}\tShow ${index + 1}\tN/A\t1000000`)

  it("chooses the latest complete English TV week and sorts the real ranks", () => {
    const tsv = [header, ...[...completeWeek].reverse(), "2026-10-18\tTV (English)\t1\tIncomplete\tN/A\t999", "2026-10-25\tFilms (English)\t1\tFilm\tN/A\t999"].join("\n")
    const items = parseNetflixChart(tsv)
    expect(items).toHaveLength(10)
    expect(items[0]).toMatchObject({ id: "netflix:2026-10-11:1", title: "Show 1", url: "https://www.netflix.com/search?q=Show%201" })
    expect(items[0].extra?.info).toContain("2026-10-11")
    expect(items[9].title).toBe("Show 10")
  })

  it("handles quoted tabs and escaped quotes in official TSV titles", () => {
    const rows = completeWeek.map(row => row.includes("\t1\t") ? "2026-10-11\tTV (English)\t1\t\"A \"\"quoted\"\" show\"\t\"Season\tone\"\t1000" : row)
    const first = parseNetflixChart([header, ...rows].join("\r\n"))[0]
    expect(first.title).toBe("Season\tone")
    expect(first.url).toBe("https://www.netflix.com/search?q=A%20%22quoted%22%20show")
  })

  it("rejects invalid columns or incomplete charts instead of fabricating entries", () => {
    expect(() => parseNetflixChart("bad\tcolumns\n1\t2")).toThrow("Invalid Netflix chart columns")
    expect(() => parseNetflixChart([header, completeWeek[0]].join("\n"))).toThrow("No complete Netflix Top 10 week")
  })
})
