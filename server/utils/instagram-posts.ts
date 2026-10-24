import { load } from "cheerio"
import type { NewsItem } from "@shared/types"
import { asRecord, plainText, requireItems, validPlatformUrl } from "./platform-content"
import { parseInternationalFeed } from "./international-feed"

const WEEK = 7 * 86400000

export function instagramPostUrl(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || !["instagram.com", "www.instagram.com"].includes(url.hostname)) return undefined
    const path = /^\/(reel|p)\/([\w-]{5,32})\/?$/.exec(url.pathname)
    return path ? `https://www.instagram.com/${path[1]}/${path[2]}/` : undefined
  } catch {
    return undefined
  }
}

export function parseInstagramDiscovery(xml: string, now = Date.now()) {
  return parseInternationalFeed(xml, ["instagram.com"], true, 100)
    .filter(item => typeof item.pubDate === "number" && item.pubDate > now - WEEK && item.pubDate <= now)
}

export function instagramLinkTicket(html: string, url: string) {
  const article = /^https:\/\/news\.google\.com\/rss\/articles\/([\w-]+)(?:\?[^#]*)?$/.exec(url)
  if (!article) throw new Error("Invalid Instagram discovery link")
  const element = load(html)("[data-n-a-id]").first()
  const id = element.attr("data-n-a-id")
  const timestamp = element.attr("data-n-a-ts")
  const signature = element.attr("data-n-a-sg")
  if (id !== article[1] || !timestamp || !/^\d{1,12}$/.test(timestamp) || !signature || !/^[\w-]{1,256}$/.test(signature)) throw new Error("Instagram discovery link unavailable")
  return { id, timestamp: Number(timestamp), signature }
}

export function instagramResolveBody(tickets: ReturnType<typeof instagramLinkTicket>[]) {
  const calls = tickets.map((ticket, index) => ["Fbv4je", JSON.stringify([
    "garturlreq",
    [["en-US", "US", ["FINANCE_TOP_INDICES", "WEB_TEST_1_0_0"], null, null, 1, 1, "US:en", null, 180, null, null, null, null, null, 0, null, null, [1608992183, 723341000]], "en-US", "US", 1, [2, 3, 4, 8], 1, 0, "655000234", 0, 0, null, 0],
    ticket.id,
    ticket.timestamp,
    ticket.signature,
  ]), null, String(index)])
  return new URLSearchParams({ "f.req": JSON.stringify([calls]) }).toString()
}

export function parseInstagramResolvedLinks(response: string) {
  const links = new Map<number, string>()
  for (const line of response.split("\n")) {
    if (!line.startsWith("[")) continue
    try {
      const rows: unknown = JSON.parse(line)
      if (!Array.isArray(rows)) continue
      for (const row of rows) {
        if (!Array.isArray(row) || row[0] !== "wrb.fr" || row[1] !== "Fbv4je" || typeof row[2] !== "string"
          || typeof row[6] !== "string" || !/^\d+$/.test(row[6])) {
          continue
        }
        const result: unknown = JSON.parse(row[2])
        const url = Array.isArray(result) && result[0] === "garturlres" && typeof result[1] === "string" ? instagramPostUrl(result[1]) : undefined
        if (url) links.set(Number(row[6]), url)
      }
    } catch {
      // Other batched response frames are unrelated to the resolved post links.
    }
  }
  return links
}

export function parseInstagramEmbed(html: string, url: string, discovery: NewsItem, now = Date.now()): NewsItem {
  const canonical = instagramPostUrl(url)
  const indexedAt = discovery.pubDate
  if (!canonical || typeof indexedAt !== "number" || indexedAt <= now - WEEK || indexedAt > now) throw new Error("Instagram post outside the seven-day discovery window")
  const $ = load(html)
  if (instagramPostUrl($("a.EmbeddedMedia").attr("href") ?? "") !== canonical) throw new Error("Instagram public embed unavailable")
  const count = /^(\d[\d,]*) likes?$/.exec(plainText($("[data-log-event='likeCountClick']").first().text()))
  const likes = count ? Number(count[1].replace(/,/g, "")) : undefined
  if (!Number.isSafeInteger(likes) || !likes || likes < 1) throw new Error("Instagram public like count unavailable")
  const image = $("img.EmbeddedMediaImage").attr("src")
  const author = plainText($(".CaptionUsername").first().text())
  const kind = canonical.includes("/reel/") ? "Reel" : "Post"
  return {
    id: canonical.split("/").at(-2)!,
    title: `${author && /^[\w.]{1,30}$/.test(author) ? `@${author} — ` : ""}${discovery.title}`,
    url: canonical,
    extra: {
      image: image && validPlatformUrl(image, ["cdninstagram.com", "fbcdn.net"]) ? image : undefined,
      info: `7-day indexed picks · ${kind} · ${likes.toLocaleString("en-US")} likes · Google News date: ${new Date(indexedAt).toISOString().slice(0, 10)}`,
      instagram: { indexedAt, likes },
    },
  }
}

export function selectInstagramPosts(items: NewsItem[]) {
  return requireItems([...items].sort((a, b) => (b.extra?.instagram?.likes ?? 0) - (a.extra?.instagram?.likes ?? 0)))
}

export function isCurrentInstagramCache(cache: { id: string, items: NewsItem[] }, now = Date.now()) {
  return cache.id !== "instagram" || (cache.items.length > 0 && cache.items.every((item) => {
    const meta = asRecord(item.extra?.instagram)
    return instagramPostUrl(item.url) === item.url && typeof meta.indexedAt === "number"
      && meta.indexedAt > now - WEEK && meta.indexedAt <= now && Number.isSafeInteger(meta.likes) && Number(meta.likes) > 0
  }))
}
