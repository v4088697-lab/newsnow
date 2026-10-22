import { afterEach, describe, expect, it, vi } from "vitest"
import { defineInternationalFeed, parseInternationalFeed } from "./international-feed"
import { myFetch } from "./fetch"

vi.mock("./fetch", () => ({ myFetch: vi.fn() }))
afterEach(() => vi.resetAllMocks())

const official = `<rss><channel>
  <item><title><![CDATA[Earlier &amp; verified]]></title><link>https://www.bbc.com/news/earlier</link><pubDate>Tue, 20 Oct 2026 10:00:00 GMT</pubDate></item>
  <item><title>Latest headline</title><link>https://www.bbc.co.uk/news/latest</link><pubDate>Wed, 21 Oct 2026 10:00:00 GMT</pubDate></item>
  <item><title>Duplicate</title><link>https://www.bbc.co.uk/news/latest</link></item>
  <item><title>Wrong publisher</title><link>https://bbc.com.evil.example/story</link></item>
  <item><title>Unsafe</title><link>javascript:alert(1)</link></item>
</channel></rss>`
const aggregated = `<rss><channel>
  <item><title>A Reuters headline - Reuters</title><link>https://news.google.com/rss/articles/one</link><source url="https://www.reuters.com">Reuters</source><pubDate>Wed, 21 Oct 2026 10:00:00 GMT</pubDate></item>
  <item><title>Another publisher discussing Reuters</title><link>https://news.google.com/rss/articles/two</link><source url="https://example.com">Other outlet</source></item>
  <item><title>Unknown attribution</title><link>https://news.google.com/rss/articles/three</link></item>
</channel></rss>`

describe("international news feed parsing", () => {
  it("sorts fresh headlines, decodes text, deduplicates and rejects unrelated or unsafe URLs", () => {
    const items = parseInternationalFeed(official, ["bbc.com", "bbc.co.uk"])
    expect(items.map(item => item.title)).toEqual(["Latest headline", "Earlier & verified"])
    expect(items[0].extra?.info).toBe("Official RSS")
  })

  it("supports an Atom feed with alternate links", () => {
    const xml = `<feed><entry><title>Atom headline</title><link rel="self" href="https://www.ft.com/feed"/><link rel="alternate" href="https://www.ft.com/content/article"/><updated>2026-10-21T10:00:00Z</updated></entry></feed>`
    expect(parseInternationalFeed(xml, ["ft.com"])[0].url).toBe("https://www.ft.com/content/article")
  })

  it("requires matching publisher attribution and labels aggregated headlines", () => {
    const items = parseInternationalFeed(aggregated, ["reuters.com"], true)
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe("A Reuters headline")
    expect(items[0].extra?.info).toBe("Google News aggregation")
  })

  it.each(["<html>Access denied</html>", "<rss><channel/></rss>", "not xml"])("rejects empty or blocked feeds so existing server cache can be used", (xml) => {
    expect(() => parseInternationalFeed(xml, ["bbc.com"])).toThrow()
  })

  it("uses official feeds first", async () => {
    vi.mocked(myFetch).mockResolvedValueOnce(official)
    expect(await defineInternationalFeed("bbc")()).toHaveLength(2)
    expect(myFetch).toHaveBeenCalledTimes(1)
  })

  it("falls back to filtered aggregation when an official feed fails", async () => {
    vi.mocked(myFetch).mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce(aggregated.split("reuters.com").join("washingtonpost.com"))
    const items = await defineInternationalFeed("washingtonpost")()
    expect(items[0].extra?.info).toBe("Google News aggregation")
    expect(myFetch).toHaveBeenCalledTimes(2)
    const url = new URL(vi.mocked(myFetch).mock.calls[1][0] as string)
    expect(url.searchParams.get("q")).toBe("site:washingtonpost.com when:7d")
  })

  it("rejects unavailable aggregation instead of returning a false success", async () => {
    vi.mocked(myFetch).mockRejectedValue(new Error("Unavailable"))
    await expect(defineInternationalFeed("apnews")()).rejects.toThrow("Unavailable")
  })
})
