import { beforeEach, describe, expect, it, vi } from "vitest"
import { parsePinterestIdeas, parsePinterestUpdates } from "../server/utils/pinterest-content"
import pinterest from "../server/sources/pinterest"
import { myFetch } from "../server/utils/fetch"
import { genSources } from "../shared/pre-sources"

vi.mock("../server/utils/fetch", () => ({ myFetch: vi.fn() }))
const fetchMock = vi.mocked(myFetch)
const featured = "<a href=\"/fashion/autumn-outfits/\"><h2>Autumn &amp; style</h2><img src=\"https://i.pinimg.com/474x/photo.jpg\"></a>"
const update = "<a href=\"/news/example/\"><div class=\"StandaloneCarouselItem-copy\">Official update</div><div class=\"StandaloneCarouselItem-date\">October 20, 2026</div><img src=\"//images.ctfassets.net/photo.jpg\"></a>"

describe("pinterest image and text content", () => {
  beforeEach(() => fetchMock.mockReset())

  it("registers Pinterest in the image and text category", () => {
    expect(genSources().pinterest).toMatchObject({ name: "Pinterest", title: "图文灵感", column: "visual", type: "hottest" })
  })

  it("retains real images, distinguishes featured stories and categories, and deduplicates", () => {
    const items = parsePinterestIdeas(`${featured}${featured}
      <a href="/editorialsponsorships/beauty/"><h2>Beauty story</h2><img src="https://i.pinimg.com/474x/beauty.jpg"></a>
      <a href="/ideas/art/12345/">Art<img src="https://i.pinimg.com/originals/art.png"></a>`)
    expect(items).toHaveLength(3)
    expect(items[0]).toMatchObject({ title: "Autumn & style", extra: { image: "https://i.pinimg.com/474x/photo.jpg", info: "公开精选" } })
    expect(items.map(item => item.extra?.info)).toEqual(["公开精选", "精选合作专题", "灵感分类"])
  })

  it("rejects off-platform links and insecure or unrelated thumbnails", () => {
    const items = parsePinterestIdeas(`${featured}
      <a href="https://evil.example/ideas/art/123/"><img src="https://i.pinimg.com/art.jpg">External</a>
      <a href="/ideas/art/123/"><img src="https://i.pinimg.com.evil.example/art.jpg">Bad image</a>
      <a href="/ideas/art/456/"><img src="http://i.pinimg.com/art.jpg">Insecure image</a>`)
    expect(items).toHaveLength(1)
    expect(() => parsePinterestIdeas("<h1>Log in</h1>")).toThrow()
  })

  it("caps the public list at ten unique items", () => {
    const html = Array.from({ length: 15 }, (_, index) => `<a href="/ideas/topic/${index}/">Topic ${index}<img src="https://i.pinimg.com/${index}.jpg"></a>`).join("")
    expect(parsePinterestIdeas(html)).toHaveLength(10)
  })

  it("parses dated official updates and normalizes trusted CDN images", () => {
    expect(parsePinterestUpdates(update)[0]).toMatchObject({ title: "Official update", url: "https://newsroom.pinterest.com/news/example/", extra: { info: "官方动态", image: "https://images.ctfassets.net/photo.jpg" } })
    expect(parsePinterestUpdates(update)[0].pubDate).toBeDefined()
    expect(parsePinterestUpdates(update.replace("//images.ctfassets.net/photo.jpg", "https://evil.example/image.jpg"))[0].extra?.image).toBeUndefined()
  })

  it("uses official image and text updates when public ideas are unavailable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce(update)
    expect((await pinterest())[0].extra?.info).toBe("官方动态")
  })

  it("uses publisher-verified aggregation as the final fallback", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Unavailable")).mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce("<rss><channel><item><title>Pinterest update</title><link>https://news.google.com/rss/articles/example</link><source url=\"https://newsroom.pinterest.com\">Pinterest</source><pubDate>Tue, 20 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>")
    expect((await pinterest())[0].extra?.info).toBe("官方动态 · 2026-10-20 · Google News")
  })
})
