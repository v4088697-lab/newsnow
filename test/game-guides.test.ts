import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { parseGameFAQsWalkthroughs, parseIGNGuides, selectIGNGuides } from "../server/utils/game-guides"
import { genSources } from "../shared/pre-sources"
import ign from "../server/sources/ign"
import gamefaqs from "../server/sources/gamefaqs"
import { myFetch } from "../server/utils/fetch"

vi.mock("../server/utils/fetch", () => ({ myFetch: vi.fn() }))
const now = Date.parse("2026-10-23T15:00:00Z")
const item = (title: string, id: string, domain = "ign.com", date = "2026-10-20", aggregated = true) => `<item><title>${title}</title><link>https://${aggregated ? "news.google.com/rss/articles" : `www.${domain}/articles`}/${id}</link><source url="https://${domain}">${domain}</source><pubDate>${date}T12:00:00Z</pubDate></item>`
const feed = (...items: string[]) => `<rss><channel>${items.join("")}</channel></rss>`

describe("recent game guides", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    vi.mocked(myFetch).mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it("registers both providers in the same English Games category", () => {
    const sources = genSources()
    expect(sources.ign).toMatchObject({ name: "IGN Guides", column: "games", type: "hottest" })
    expect(sources.gamefaqs).toMatchObject({ name: "GameFAQs", column: "games", type: "hottest" })
  })

  it("prioritizes real game recommendations, then recent identifiable game guides", () => {
    const items = parseIGNGuides(feed(item("Boss Walkthrough - Example Game Guide", "guide", "ign.com", "2026-10-22"), item("The Best Games to Play This Month", "picks", "ign.com", "2026-10-20")), true)
    expect(items.map(item => item.id)).toEqual(["https://news.google.com/rss/articles/picks", "https://news.google.com/rss/articles/guide"])
    expect(items[0].extra?.info).toBe("IGN game recommendations · Google News date: 2026-10-20 · Google News")
    expect(items[1].extra?.hover).toContain("revision date is not verified")
  })

  it("excludes old, future, undated, unrelated, specialized and unverified-publisher entries", () => {
    const items = parseIGNGuides(feed(
      item("Top Games", "old", "ign.com", "2026-09-01"),
      item("Top Games", "future", "ign.com", "2026-11-01"),
      item("Top Games", "undated", "ign.com", "invalid"),
      item("Best Movies and Games", "movies"),
      item("Best Gaming Headsets", "hardware"),
      item("Collectibles - Example Game Guide", "collectibles"),
      item("All Equipment Locations", "generic"),
      item("How to Beat a Boss - Location and Guide", "generic-guide"),
      item("Top Games", "fake", "ign.com.evil.example"),
      item("Top Games", "valid"),
    ), true)
    expect(items.map(item => item.id)).toEqual(["https://news.google.com/rss/articles/valid"])
  })

  it("merges duplicate entries and preserves official source labels", () => {
    const official = parseIGNGuides(feed(item("The Best Games", "official", "ign.com", "2026-10-20", false)))
    expect(selectIGNGuides([...official, ...official])).toHaveLength(1)
    expect(official[0].extra?.info).toContain("Published: 2026-10-20 · Official RSS")
    expect(() => selectIGNGuides([])).toThrow()
  })

  it("caps recommendations at ten without manufacturing missing guides", () => {
    const xml = feed(...Array.from({ length: 15 }, (_, i) => item(`Top Games List ${i}`, `${i}`)))
    expect(selectIGNGuides(parseIGNGuides(xml, true))).toHaveLength(10)
  })

  it("limits GameFAQs to recent walkthroughs and story chapters, excluding side content and other publishers", () => {
    const xml = feed(
      item("Example Game Walkthrough and Guide", "main", "gamefaqs.gamespot.com"),
      item("Prologue - Day 1 - Example Game Walkthrough", "chapter", "gamefaqs.gamespot.com"),
      item("Side Quests - Example Game Walkthrough", "side", "gamefaqs.gamespot.com"),
      item("Combat Guide - Example Game Walkthrough", "combat", "gamefaqs.gamespot.com"),
      item("GameFAQs Message Boards", "discussion", "gamefaqs.gamespot.com"),
      item("Example Walkthrough", "old", "gamefaqs.gamespot.com", "2025-01-01"),
      item("Example Walkthrough", "fake", "gamefaqs.gamespot.com.evil.example"),
    )
    const items = parseGameFAQsWalkthroughs(xml)
    expect(items).toHaveLength(2)
    expect(items[0].extra?.info).toContain("Story walkthrough · Google News date: 2026-10-20")
    expect(items[0].title).toBe("Example Game Walkthrough and Guide")
    expect(() => parseGameFAQsWalkthroughs(feed(item("Old Walkthrough", "old", "gamefaqs.gamespot.com", "2025-01-01")))).toThrow()
  })

  it("falls back to publisher-verified IGN aggregation and retains a surviving query", async () => {
    vi.mocked(myFetch).mockRejectedValueOnce(new Error("403")).mockResolvedValueOnce(feed(item("Top Games", "picks"))).mockRejectedValueOnce(new Error("Guide index unavailable"))
    expect((await ign())[0].extra?.info).toContain("Google News")
    expect(myFetch).toHaveBeenCalledTimes(3)
  })

  it("does not substitute old guides or news when current walkthroughs are unavailable", async () => {
    vi.mocked(myFetch).mockResolvedValueOnce(feed(item("Old Walkthrough", "old", "gamefaqs.gamespot.com", "2020-01-01")))
    await expect(gamefaqs()).rejects.toThrow()
    vi.mocked(myFetch).mockRejectedValueOnce(new Error("Unavailable"))
    await expect(gamefaqs()).rejects.toThrow("Unavailable")
  })
})
