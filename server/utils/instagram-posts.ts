import { load } from "cheerio"
import type { NewsItem } from "@shared/types"
import { parseGoogleNewsResolvedLinks } from "./google-news-links"
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

export { googleNewsLinkTicket as instagramLinkTicket, googleNewsResolveBody as instagramResolveBody } from "./google-news-links"

export function parseInstagramResolvedLinks(response: string) {
  return parseGoogleNewsResolvedLinks(response, instagramPostUrl)
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
