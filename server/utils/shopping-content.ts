import { load } from "cheerio"
import type { NewsItem } from "@shared/types"
import { plainText, requireItems, validPlatformUrl } from "./platform-content"

function officialUrl(href: string | undefined, base: string) {
  try {
    const url = new URL(href ?? "", base)
    return validPlatformUrl(url.href, [new URL(base).hostname]) ? url : undefined
  } catch {
    return undefined
  }
}

export function parseAmazonBestsellers(html: string): NewsItem[] {
  const $ = load(html)
  const items: NewsItem[] = []
  $("li.a-carousel-card,[id^=\"p13n-asin-index\"]").each((_, element) => {
    const row = $(element)
    const titleNode = row.find("[class*=\"p13n-sc-truncate\"],[class*=\"line-clamp\"]").first()
    const title = plainText(titleNode.html() ?? "")
    const url = officialUrl(titleNode.closest("a").attr("href"), "https://www.amazon.com")
    const asin = url && /\/dp\/([a-z0-9]{10})(?:[/?]|$)/i.exec(url.pathname)?.[1]
    if (!asin || !title) return
    const category = plainText(row.closest(".a-carousel-container").find("h2").first().html() ?? "").replace(/^Best Sellers in\s+/i, "")
    const rank = /^#(\d+)$/.exec(row.find(".zg-bdg-text").first().text().trim())?.[1]
    items.push({ id: asin, title, url: `https://www.amazon.com/dp/${asin}`, extra: { info: ["Category best sellers", category, rank ? `Category #${rank}` : ""].filter(Boolean).join(" · ") } })
  })
  return requireItems(items)
}

export function parseTemuCategories(html: string): NewsItem[] {
  const $ = load(html)
  const items: NewsItem[] = []
  $("a[href*=\"-o3-\"]").each((_, element) => {
    const anchor = $(element)
    const url = officialUrl(anchor.attr("href"), "https://www.temu.com")
    const id = url && /^\/[^/?]+-o3-(\d+)\.html$/.exec(url.pathname)?.[1]
    const title = plainText(anchor.html() ?? "")
    if (!id || !title || title.includes("*")) return
    items.push({ id, title, url: `${url!.origin}${url!.pathname}`, extra: { info: "Official product categories" } })
  })
  return requireItems(items)
}

export function parseTemuReleases(html: string): NewsItem[] {
  const $ = load(html)
  const items: NewsItem[] = []
  $("a[href*=\"/news-releases/\"]").each((_, element) => {
    const anchor = $(element)
    const url = officialUrl(anchor.attr("href"), "https://www.prnewswire.com")
    if (!url || !/^\/news-releases\/[^/]+\.html$/.test(url.pathname)) return
    const heading = anchor.find("h3").first().clone()
    const date = heading.find("small").text().trim()
    heading.find("small").remove()
    const title = plainText(heading.html() ?? "")
    if (!title) return
    items.push({ id: url.href, title, url: url.href, extra: { info: `Temu press release · PR Newswire${date ? ` · ${date}` : ""}` } })
  })
  return requireItems(items)
}

export function parseEbayRefurbished(html: string): NewsItem[] {
  const $ = load(html)
  const items: NewsItem[] = []
  $(".dne-itemtile").each((_, element) => {
    const row = $(element)
    if (!/refurbished/i.test(row.find(".dne-itemtile-badge").text())) return
    const heading = row.find(".dne-itemtile-title").first()
    const title = plainText(heading.html() ?? "")
    const url = officialUrl(heading.closest("a").attr("href"), "https://www.ebay.com")
    const id = url && /^\/itm\/(?:[^/]+\/)?(\d+)(?:\/|$)/.exec(url.pathname)?.[1]
    if (!id || !title) return
    const price = row.find(".dne-itemtile-price [itemprop=\"price\"]").first().text().trim()
    items.push({ id, title, url: `https://www.ebay.com/itm/${id}`, extra: { info: `Official refurbished picks${price ? ` · Listed price ${price}` : ""}` } })
  })
  return requireItems(items)
}

export function parseEbayAuctions(html: string): NewsItem[] {
  const $ = load(html)
  const items: NewsItem[] = []
  $(".s-item,.s-card").each((_, element) => {
    const row = $(element)
    const text = row.text()
    const bids = /\b\d+\s+bids?\b/i.exec(text)?.[0]
    if (!bids || !/\b(?:used|pre-owned)\b/i.test(text)) return
    const title = plainText(row.find(".s-item__title,.s-card__title").first().html() ?? "")
    const url = officialUrl(row.find("a[href*=\"/itm/\"]").first().attr("href"), "https://www.ebay.com")
    const id = url && /^\/itm\/(?:[^/]+\/)?(\d+)(?:\/|$)/.exec(url.pathname)?.[1]
    if (!id || !title) return
    const price = row.find(".s-item__price,.s-card__price").first().text().trim()
    items.push({ id, title, url: `https://www.ebay.com/itm/${id}`, extra: { info: `Used collectible auctions · ${bids}${price ? ` · Listed price ${price}` : ""}` } })
  })
  return requireItems(items)
}
