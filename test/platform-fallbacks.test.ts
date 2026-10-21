import { beforeEach, describe, expect, it, vi } from "vitest"
import youtube from "../server/sources/youtube"
import kick from "../server/sources/kick"
import twitch from "../server/sources/twitch"
import vimeo from "../server/sources/vimeo"
import { myFetch } from "../server/utils/fetch"

vi.mock("../server/utils/fetch", () => ({ myFetch: vi.fn() }))
const fetchMock = vi.mocked(myFetch)

describe("official updates when public rankings are unavailable", () => {
  beforeEach(() => fetchMock.mockReset())

  it("falls back from YouTube charts to publisher-verified, dated official announcements", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Charts unavailable")).mockResolvedValueOnce(`<rss><channel><item>
      <title>Official announcement - YouTube Blog</title><link>https://news.google.com/rss/articles/example</link>
      <source url="https://blog.youtube">YouTube Blog</source><pubDate>Tue, 20 Oct 2026 12:00:00 GMT</pubDate>
      </item><item><title>Wrong publisher</title><link>https://news.google.com/rss/articles/other</link>
      <source url="https://unrelated.example">Other</source></item></channel></rss>`)
    const items = await youtube()
    expect(items).toHaveLength(1)
    expect(items[0].extra?.info).toBe("官方动态 · 2026-10-20 · Google News")
    expect(fetchMock.mock.calls[1][0].toString()).toContain("news.google.com/rss/search")
  })

  it("shows only the official Kick headline when the public directory fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Directory unavailable")).mockResolvedValueOnce(`<a href="/news-and-press/announcement">
      <span title="Headline">Official headline</span><p>A longer description</p></a>`)
    expect((await kick())[0]).toMatchObject({ title: "Official headline", extra: { info: "官方动态" } })
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ headers: { "User-Agent": expect.stringMatching(/^NewsNow\//) } })
  })

  it("falls back to Twitch official posts without presenting them as live categories", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Directory unavailable")).mockResolvedValueOnce(`<article>
      <h2 class="line-clamp-2">Stream update</h2><a href="/en/2026/10/20/stream-update/">Post</a></article>`)
    expect((await twitch())[0]).toMatchObject({ title: "Stream update", extra: { info: "官方动态" } })
  })

  it("distinguishes Vimeo blog updates from unavailable editor picks", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Staff picks unavailable")).mockResolvedValueOnce(`<rss><channel><item>
      <title>Vimeo update</title><link>https://vimeo.com/blog/post/update</link></item></channel></rss>`)
    expect((await vimeo())[0]).toMatchObject({ title: "Vimeo update", extra: { info: "官方动态" } })
  })
})
