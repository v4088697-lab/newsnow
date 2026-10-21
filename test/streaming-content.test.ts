import { beforeEach, describe, expect, it, vi } from "vitest"
import { parseParamountReleases, parsePeacockRecommendations } from "../server/utils/streaming-content"
import paramountplus from "../server/sources/paramountplus"
import peacock from "../server/sources/peacock"
import { myFetch } from "../server/utils/fetch"

vi.mock("../server/utils/fetch", () => ({ myFetch: vi.fn() }))
const fetchMock = vi.mocked(myFetch)

describe("streaming platform replacements", () => {
  beforeEach(() => fetchMock.mockReset())

  it("preserves Paramount release query links and extracts only the headline", () => {
    const items = parseParamountReleases(`<a class="release-link" href="/paramount-plus/shows/example/releases/?view=123-trailer">
      <p>Show label</p><h4 class="release-title">Official trailer</h4><p>Long excerpt</p><time>2026-10-20T12:00:00Z</time></a>
      <a class="release-link" href="/paramount-plus/releases/?view=124-news"><h4 class="release-title">Another release</h4><time>2026-10-15T12:00:00Z</time></a>
      <a class="release-link" href="https://evil.example/paramount-plus/releases/?view=456"><h4 class="release-title">External</h4></a>`)
    expect(items).toHaveLength(2)
    expect(items.map(item => item.pubDate)).toEqual([Date.parse("2026-10-20T12:00:00Z"), Date.parse("2026-10-15T12:00:00Z")])
    expect(items[0]).toMatchObject({ title: "Official trailer", url: "https://www.paramountpressexpress.com/paramount-plus/shows/example/releases/?view=123-trailer", extra: { info: "官方动态" } })
  })

  it("puts Peacock popular articles first and labels recommendations separately", () => {
    const items = parsePeacockRecommendations(`<a href="/blog/recommended"><div class="headline">Recommended show</div></a>
      <article class="teaser--microsite-most-popular"><a href="/blog/popular"><div class="headline">Popular show</div></a></article>
      <a href="/blog/popular"><div class="headline">Duplicate popular show</div></a>
      <a href="/blog/topic/movies"><div class="headline">Category</div></a>`)
    expect(items.map(item => item.title)).toEqual(["Popular show", "Recommended show"])
    expect(items.map(item => item.extra?.info)).toEqual(["官方博客热门", "官方推荐"])
  })

  it("uses Peacock recommendations even if the popular section is missing", () => {
    expect(parsePeacockRecommendations("<a href=\"/blog/new-show\"><div class=\"headline\">New show</div></a>")[0].extra?.info).toBe("官方推荐")
    expect(() => parsePeacockRecommendations("<h1>Unavailable</h1>")).toThrow()
  })

  it.each([
    ["Paramount+", paramountplus, "https://www.paramountpressexpress.com"],
    ["Peacock", peacock, "https://www.peacocktv.com"],
  ] as const)("labels %s official aggregation when the direct page is unavailable", async (_, getter, publisher) => {
    fetchMock.mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce(`<rss><channel><item>
      <title>New release</title><link>https://news.google.com/rss/articles/release</link>
      <source url="${publisher}">Official publisher</source><pubDate>Tue, 20 Oct 2026 12:00:00 GMT</pubDate>
      </item></channel></rss>`)
    const items = await getter()
    expect(items[0].extra?.info).toBe("官方动态 · 2026-10-20 · Google News")
  })
})
