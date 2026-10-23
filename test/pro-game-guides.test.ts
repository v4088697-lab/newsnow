import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { parseProGameGuides, selectProGameGuides } from "../server/utils/pro-game-guides"
import { genSources } from "../shared/pre-sources"
import progameguides from "../server/sources/progameguides"
import { myFetch } from "../server/utils/fetch"

vi.mock("../server/utils/fetch", () => ({ myFetch: vi.fn() }))
const now = Date.parse("2026-10-23T15:00:00Z")
const item = (title: string, id: string, date = "2026-10-20", aggregated = false, domain = "progameguides.com") => `<item><title>${title}</title><link>https://${aggregated ? "news.google.com/rss/articles" : domain}/${id}</link><source url="https://${domain}">${domain}</source><pubDate>${date}T12:00:00Z</pubDate></item>`
const feed = (...items: string[]) => `<rss><channel>${items.join("")}</channel></rss>`

describe("pro Game Guides", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    vi.mocked(myFetch).mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it("registers the English card in Games and discloses publication versus launch dates", () => {
    expect(genSources().progameguides).toMatchObject({ name: "Pro Game Guides", column: "games", type: "hottest" })
    expect(genSources().progameguides.desc).toContain("Article dates do not establish")
  })

  it("prioritizes new-game, review and beginner coverage while preserving original titles and dates", () => {
    const items = parseProGameGuides(feed(item("An event guide", "event", "2026-10-22"), item("A New Game Release Date", "release"), item("Example Game Review", "review"), item("A Beginner Guide", "beginner")))
    const selected = selectProGameGuides(items)
    expect(selected.map(item => item.title)).toEqual(["A New Game Release Date", "Example Game Review", "A Beginner Guide", "An event guide"])
    expect(selected[0].extra?.info).toBe("New-game coverage · Published: 2026-10-20 · Official RSS")
  })

  it("rejects stale, future, undated, code-only, hardware, movie and index entries", () => {
    const parsed = parseProGameGuides(feed(item("Old Guide", "old", "2025-01-01"), item("Future Guide", "future", "2026-11-01"), item("Unknown Guide", "unknown", "invalid"), item("Game Codes", "codes"), item("Best Headsets", "hardware"), item("Best Movies", "movies"), item("Roblox News &amp; Leaks | Page 2 of 30", "index"), item("A Guide", "author/writer"), item("A Real Game Guide", "real")))
    expect(parsed.map(item => item.title)).toEqual(["A Real Game Guide"])
  })

  it("validates publisher domains and labels aggregated dates accurately", () => {
    const parsed = parseProGameGuides(feed(item("Game Guide", "real", "2026-10-20", true), item("Forged Guide", "fake", "2026-10-20", true, "progameguides.com.evil.example"), item("Shah Zaib", "writer", "2026-10-20", true), item("Best Game Guide (2025)", "outdated-title", "2026-10-20", true)), true)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].extra?.info).toBe("Recent game guide · Google News date: 2026-10-20 · Google News")
    expect(parsed[0].extra?.hover).toContain("not game launch dates")
  })

  it("deduplicates official and aggregated titles, favors official links and caps the list at ten", () => {
    const official = parseProGameGuides(feed(item("Game Guide", "official")))
    const aggregated = parseProGameGuides(feed(item("Game Guide", "aggregated", "2026-10-21", true)), true)
    const selected = selectProGameGuides([...official, ...aggregated])
    expect(selected).toHaveLength(1)
    expect(selected[0].url).toBe("https://progameguides.com/official")
    expect(selectProGameGuides(parseProGameGuides(feed(...Array.from({ length: 15 }, (_, i) => item(`Game Guide ${i}`, `${i}`)))))).toHaveLength(10)
  })

  it("keeps official articles when all supplemental queries fail", async () => {
    vi.mocked(myFetch).mockResolvedValueOnce(feed(item("New Game Review", "official"))).mockRejectedValue(new Error("Search unavailable"))
    expect((await progameguides())[0].extra?.info).toContain("Official RSS")
  })

  it("gives different games a place before filling with more of the same event", () => {
    const items = parseProGameGuides(feed(item("The Hollow Guide One", "h1"), item("The Hollow Guide Two", "h2"), item("The Hollow Guide Three", "h3"), item("Fortnite Event Guide", "fortnite")))
    expect(selectProGameGuides(items).map(item => item.title)).toEqual(["The Hollow Guide One", "The Hollow Guide Two", "Fortnite Event Guide", "The Hollow Guide Three"])
  })

  it("falls back to verified aggregation without substituting old or unrelated material", async () => {
    vi.mocked(myFetch).mockRejectedValueOnce(new Error("Official feed unavailable")).mockResolvedValueOnce(feed(item("New Game Review", "agg", "2026-10-20", true))).mockRejectedValueOnce(new Error("Unavailable"))
    expect((await progameguides())[0].extra?.info).toContain("Google News")
    vi.mocked(myFetch).mockRejectedValue(new Error("Unavailable"))
    await expect(progameguides()).rejects.toThrow()
  })
})
