import { beforeEach, describe, expect, it, vi } from "vitest"
import { parseRedditFeed } from "../server/utils/reddit-content"
import reddit from "../server/sources/reddit"
import { myFetch } from "../server/utils/fetch"
import { genSources } from "../shared/pre-sources"

vi.mock("../server/utils/fetch", () => ({ myFetch: vi.fn() }))
const fetchMock = vi.mocked(myFetch)
const entry = (id: string, title = "Interesting discussion", url = `https://www.reddit.com/r/science/comments/${id}/discussion/`) => `<entry><id>t3_${id}</id><title>${title}</title><link href="${url}"/><published>2026-10-22T12:00:00Z</published></entry>`

describe("reddit interest content", () => {
  beforeEach(() => fetchMock.mockReset())

  it("registers Reddit in the interest category", () => {
    expect(genSources().reddit).toMatchObject({ name: "Reddit", title: "兴趣热门", column: "interests", type: "hottest" })
  })

  it("keeps the public feed order, title, community and publication date", () => {
    const items = parseRedditFeed(`<feed>${entry("abc", "Science &amp; nature")}${entry("def")}</feed>`)
    expect(items.map(item => item.id)).toEqual(["abc", "def"])
    expect(items[0]).toMatchObject({ title: "Science & nature", pubDate: Date.parse("2026-10-22T12:00:00Z"), extra: { info: "r/science · 公开热门 · 官方 RSS" } })
  })

  it("uses alternate links instead of Atom self links", () => {
    const items = parseRedditFeed("<feed><entry><title>A discussion</title><link rel=\"self\" href=\"https://www.reddit.com/api/example\"/><link rel=\"alternate\" href=\"https://www.reddit.com/r/books/comments/abc/title/\"/></entry></feed>")
    expect(items[0].extra?.info).toContain("r/books")
  })

  it("deduplicates and caps the list at ten real discussions", () => {
    const xml = `<feed>${entry("abc")}${entry("abc")}${Array.from({ length: 15 }, (_, i) => entry(`post${i}`)).join("")}</feed>`
    expect(parseRedditFeed(xml)).toHaveLength(10)
  })

  it("rejects external domains, insecure links and non-post navigation", () => {
    const xml = `<feed>${entry("abc")}${entry("bad", "Bad", "https://reddit.com.evil.example/r/science/comments/bad/")}${entry("http", "Insecure", "http://www.reddit.com/r/science/comments/http/")}${entry("nav", "Navigation", "https://www.reddit.com/r/science/")}</feed>`
    expect(parseRedditFeed(xml)).toHaveLength(1)
    expect(() => parseRedditFeed("<html><h1>Access denied</h1></html>")).toThrow()
  })

  it("labels the official fallback when the public feed is unavailable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce("<rss><channel><item><title>Reddit announcement</title><link>https://news.google.com/rss/articles/announcement</link><source url=\"https://redditinc.com\">Reddit</source><pubDate>Thu, 22 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>")
    expect((await reddit())[0].extra?.info).toBe("官方动态 · 2026-10-22 · Google News")
    expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.get("q")).toBe("site:redditinc.com/news")
  })
})
