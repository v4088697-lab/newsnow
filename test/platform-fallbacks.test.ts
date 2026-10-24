import { beforeEach, describe, expect, it, vi } from "vitest"
import kick from "../server/sources/kick"
import twitch from "../server/sources/twitch"
import vimeo from "../server/sources/vimeo"
import { myFetch } from "../server/utils/fetch"

vi.mock("../server/utils/fetch", () => ({ myFetch: vi.fn() }))
const fetchMock = vi.mocked(myFetch)

describe("official updates when public rankings are unavailable", () => {
  beforeEach(() => fetchMock.mockReset())

  it("shows only the official Kick headline when the public directory fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Directory unavailable")).mockResolvedValueOnce(`<a href="/news-and-press/announcement">
      <span title="Headline">Official headline</span><p>A longer description</p></a>`)
    expect((await kick())[0]).toMatchObject({ title: "Official headline", extra: { info: "Official updates" } })
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ headers: { "User-Agent": expect.stringMatching(/^NewsNow\//) } })
  })

  it("falls back to Twitch official posts without presenting them as live categories", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Directory unavailable")).mockResolvedValueOnce(`<article>
      <h2 class="line-clamp-2">Stream update</h2><a href="/en/2026/10/20/stream-update/">Post</a></article>`)
    expect((await twitch())[0]).toMatchObject({ title: "Stream update", extra: { info: "Official updates" } })
  })

  it("distinguishes Vimeo blog updates from unavailable editor picks", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Staff picks unavailable")).mockResolvedValueOnce(`<rss><channel><item>
      <title>Vimeo update</title><link>https://vimeo.com/blog/post/update</link></item></channel></rss>`)
    expect((await vimeo())[0]).toMatchObject({ title: "Vimeo update", extra: { info: "Official updates" } })
  })
})
