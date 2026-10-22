import { load } from "cheerio"
import type { NewsItem } from "@shared/types"
import { plainText, requireItems, validPlatformUrl } from "./platform-content"

export function parsePinterestIdeas(html: string): NewsItem[] {
  const $ = load(html)
  const items: NewsItem[] = []
  $("a[href]").each((_, element) => {
    const anchor = $(element)
    let url: URL
    try {
      url = new URL(anchor.attr("href")!, "https://www.pinterest.com")
    } catch {
      return
    }
    if (!validPlatformUrl(url.href, ["www.pinterest.com"])) return
    const isCategory = /^\/ideas\/[^/]+\/\d+\/?$/.test(url.pathname)
    const isFeatured = /^\/(?:editorialsponsorships|fashion)\/[^/]+\/?$/.test(url.pathname)
    if (!isCategory && !isFeatured) return
    const image = anchor.find("img").first().attr("src")
    const title = plainText(isFeatured ? anchor.find("h2").first().html() ?? "" : anchor.text())
    if (!title || !image || !validPlatformUrl(image, ["i.pinimg.com"])) return
    const info = url.pathname.startsWith("/editorialsponsorships/") ? "Sponsored feature" : isFeatured ? "Public features" : "Inspiration categories"
    items.push({ id: url.href, title, url: url.href, extra: { image, info } })
  })
  return requireItems(items)
}

export function parsePinterestUpdates(html: string): NewsItem[] {
  const $ = load(html)
  const items: NewsItem[] = []
  $("a[href*=\"/news/\"]").each((_, element) => {
    const anchor = $(element)
    let url: URL
    try {
      url = new URL(anchor.attr("href")!, "https://newsroom.pinterest.com")
    } catch {
      return
    }
    if (!validPlatformUrl(url.href, ["newsroom.pinterest.com"]) || !/^\/(?:en\/)?news\/[^/]+\/?$/.test(url.pathname)) return
    const title = plainText(anchor.find(".StandaloneCarouselItem-copy").first().html() ?? "")
    if (!title) return
    const date = Date.parse(anchor.find(".StandaloneCarouselItem-date").first().text())
    const imageSrc = anchor.find("img").first().attr("src")
    const image = imageSrc?.startsWith("//") ? `https:${imageSrc}` : imageSrc
    items.push({
      id: url.href,
      title,
      url: url.href,
      pubDate: Number.isFinite(date) ? date : undefined,
      extra: { info: "Official updates", image: image && validPlatformUrl(image, ["images.ctfassets.net"]) ? image : undefined },
    })
  })
  return requireItems(items)
}
