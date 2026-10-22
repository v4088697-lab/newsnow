import { beforeEach, describe, expect, it, vi } from "vitest"
import { parseAmazonBestsellers, parseEbayAuctions, parseEbayRefurbished, parseTemuCategories, parseTemuReleases } from "../server/utils/shopping-content"
import amazon from "../server/sources/amazon"
import temu from "../server/sources/temu"
import ebay from "../server/sources/ebay"
import { myFetch } from "../server/utils/fetch"
import { genSources } from "../shared/pre-sources"

vi.mock("../server/utils/fetch", () => ({ myFetch: vi.fn() }))
const fetchMock = vi.mocked(myFetch)
const amazonHtml = "<div class=\"a-carousel-container\"><h2>Best Sellers in Electronics</h2><li class=\"a-carousel-card\"><span class=\"zg-bdg-text\">#3</span><a href=\"/dp/B012345678/ref=tracking?tag=tracking\"><div class=\"p13n-sc-truncate\">Real product</div></a></li></div>"
const refurb = (id: string, badge = "eBay Refurbished", host = "www.ebay.com") => `<div class="dne-itemtile"><a href="https://${host}/itm/${id}?_trkparms=tracking"><h3 class="dne-itemtile-title">Refurbished product</h3></a><span class="dne-itemtile-badge">${badge}</span><div class="dne-itemtile-price"><span itemprop="price">$94.00</span></div></div>`
const temuRelease = "<a href=\"/news-releases/temu-announcement-123.html\"><h3><small>Oct 20, 2026, 08:00 ET</small>Temu announcement</h3><p>Description</p></a>"

describe("shopping platform content", () => {
  beforeEach(() => fetchMock.mockReset())

  it("registers the requested ecommerce and secondhand auction categories", () => {
    const sources = genSources()
    expect(sources.amazon.column).toBe("ecommerce")
    expect(sources.temu.column).toBe("ecommerce")
    expect(sources.ebay.column).toBe("auctions")
  })

  it("preserves Amazon category ranks and removes tracking from product links", () => {
    expect(parseAmazonBestsellers(amazonHtml)[0]).toMatchObject({ title: "Real product", url: "https://www.amazon.com/dp/B012345678", extra: { info: "分类畅销 · Electronics · 分类第 3 名" } })
    expect(() => parseAmazonBestsellers(amazonHtml.replace("/dp/B012345678", "https://evil.example/dp/B012345678"))).toThrow()
  })

  it("deduplicates Amazon products and caps the list at ten", () => {
    const html = Array.from({ length: 15 }, (_, i) => amazonHtml.replaceAll("B012345678", `B${String(i).padStart(9, "0")}`)).join("")
    expect(parseAmazonBestsellers(html + html)).toHaveLength(10)
  })

  it("shows Temu real category links without implying product popularity", () => {
    const items = parseTemuCategories("<a href=\"/home-kitchen-o3-36.html?tracking=1\">Home &amp; Kitchen</a><a href=\"/home-kitchen-o3-36.html\">Duplicate</a><a href=\"https://evil.example/x-o3-1.html\">External</a><a href=\"/broken-o3-2.html\">Masked * title</a>")
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ title: "Home & Kitchen", url: "https://www.temu.com/home-kitchen-o3-36.html", extra: { info: "官方商品分类" } })
  })

  it("separates Temu issuer headlines from dates and article descriptions", () => {
    const item = parseTemuReleases(temuRelease)[0]
    expect(item.title).toBe("Temu announcement")
    expect(item.extra?.info).toBe("Temu 新闻稿 · PR Newswire · Oct 20, 2026, 08:00 ET")
  })

  it("includes only explicitly refurbished eBay recommendations", () => {
    const items = parseEbayRefurbished(refurb("123") + refurb("123") + refurb("456", "Brand new") + refurb("789", "eBay Refurbished", "evil.example"))
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ url: "https://www.ebay.com/itm/123", extra: { info: "官方翻新推荐 · 页面价格 $94.00" } })
    expect(items[0].extra?.info).not.toContain("拍卖")
  })

  it("requires used condition and a real bid count for eBay auction entries", () => {
    const row = "<div class=\"s-item\"><a href=\"/itm/123\"><h3 class=\"s-item__title\">Used collectible</h3></a><span>Pre-Owned · 3 bids</span><span class=\"s-item__price\">$20.00</span></div>"
    expect(parseEbayAuctions(row)[0].extra?.info).toBe("二手藏品拍卖 · 3 bids · 页面价格 $20.00")
    expect(() => parseEbayAuctions(row.replace("3 bids", "Buy it now"))).toThrow()
    expect(() => parseEbayAuctions(row.replace("Pre-Owned", "Brand new").replace("Used collectible", "Collectible"))).toThrow()
  })

  it.each([parseAmazonBestsellers, parseTemuCategories, parseEbayRefurbished])("rejects access-denied pages rather than inventing listings", (parser) => {
    expect(() => parser("<h1>Access denied</h1>")).toThrow()
  })

  it("uses dated Amazon official announcements when the chart is unavailable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce("<rss><channel><item><title>Amazon announcement</title><link>https://news.google.com/rss/articles/amazon</link><source url=\"https://www.aboutamazon.com\">Amazon</source><pubDate>Thu, 22 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>")
    expect((await amazon())[0].extra?.info).toContain("官方动态 · 2026-10-22")
  })

  it("uses the Temu-specific issuer page when categories are unavailable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce(temuRelease)
    expect((await temu())[0].extra?.info).toContain("Temu 新闻稿 · PR Newswire")
    expect(fetchMock.mock.calls[1][0]).toBe("https://www.prnewswire.com/news/temu/")
  })

  it("labels eBay refurbished recommendations when auction search is restricted", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Restricted")).mockResolvedValueOnce(refurb("123"))
    expect((await ebay())[0].extra?.info).toContain("官方翻新推荐")
  })
})
