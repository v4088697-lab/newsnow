import { load } from "cheerio"
import type { NewsItem } from "@shared/types"
import { parseInternationalFeed } from "./international-feed"
import { asRecord, plainText, requireItems } from "./platform-content"

const WEEK = 7 * 86400000

export function rumbleVideoUrl(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || !["rumble.com", "www.rumble.com"].includes(url.hostname) || url.username || url.password || url.port) return undefined
    return /^\/v[a-z0-9]{4,12}(?:-[^/]*)?\.html$/i.test(url.pathname) ? `https://rumble.com${url.pathname}` : undefined
  } catch {
    return undefined
  }
}

export function parseRumbleDiscovery(xml: string, now = Date.now()) {
  return parseInternationalFeed(xml, ["rumble.com"], true, 100)
    .filter(item => typeof item.pubDate === "number" && item.pubDate > now - WEEK && item.pubDate <= now)
    .sort((a, b) => Number(b.pubDate) - Number(a.pubDate))
}

export function rumbleIndexedPick(item: NewsItem, resolvedUrl: string, now = Date.now()): NewsItem {
  const url = rumbleVideoUrl(resolvedUrl)
  if (!url || typeof item.pubDate !== "number" || item.pubDate <= now - WEEK || item.pubDate > now) throw new Error("Rumble recent video unavailable")
  return {
    ...item,
    id: url,
    url,
    extra: {
      rumble: { kind: "indexed", date: item.pubDate },
      info: `7-day indexed picks · Video · Google News date: ${new Date(item.pubDate).toISOString().slice(0, 10)}`,
    },
  }
}

export function parseRumbleVideos(html: string, now = Date.now()): NewsItem[] {
  const $ = load(html)
  const items: NewsItem[] = []
  const visit = (value: unknown, depth = 0) => {
    if (depth > 8) return
    if (Array.isArray(value)) return value.forEach(entry => visit(entry, depth + 1))
    const video = asRecord(value)
    const types = Array.isArray(video["@type"]) ? video["@type"] : [video["@type"]]
    if (types.includes("VideoObject")) {
      const url = rumbleVideoUrl(String(video.url ?? asRecord(video.mainEntityOfPage)["@id"] ?? ""))
      const publishedAt = Date.parse(String(video.uploadDate ?? video.datePublished ?? ""))
      const title = plainText(video.name ?? video.headline)
      const stats = Array.isArray(video.interactionStatistic) ? video.interactionStatistic : [video.interactionStatistic]
      const views = stats.map(asRecord).filter(stat => /(?:Watch|View)Action$/.test(String(typeof stat.interactionType === "string" ? stat.interactionType : asRecord(stat.interactionType)["@type"] ?? ""))).map(stat => typeof stat.userInteractionCount === "number" || (typeof stat.userInteractionCount === "string" && /^\d+$/.test(stat.userInteractionCount)) ? Number(stat.userInteractionCount) : Number.NaN).find(count => Number.isSafeInteger(count) && count >= 0)
      if (url && title && publishedAt > now - WEEK && publishedAt <= now && views !== undefined) {
        items.push({
          id: url,
          url,
          title,
          pubDate: publishedAt,
          extra: {
            rumble: { kind: "published", date: publishedAt, views },
            info: `7-day video picks · ${views.toLocaleString("en-US")} views · Published: ${new Date(publishedAt).toISOString().slice(0, 10)}`,
          },
        })
      }
    }
    for (const key of ["@graph", "itemListElement", "item", "video"]) {
      if (video[key]) visit(video[key], depth + 1)
    }
  }
  $("script[type='application/ld+json']").each((_, element) => {
    try {
      visit(JSON.parse($(element).text()))
    } catch { /* Invalid public metadata cannot establish a video's age. */ }
  })
  return selectRumblePicks(items, now)
}

export function isCurrentRumbleItem(item: NewsItem, now = Date.now()) {
  const meta = item.extra?.rumble
  if (meta?.kind === "official") {
    try {
      const url = new URL(item.url)
      return url.protocol === "https:" && url.hostname === "www.rum.group" && /^\/blog\/[^/]+\/?$/.test(url.pathname)
        && item.extra?.info === "Official company updates"
    } catch {
      return false
    }
  }
  return !!meta && rumbleVideoUrl(item.url) === item.url && item.id === item.url
    && typeof meta.date === "number" && meta.date > now - WEEK && meta.date <= now
    && item.pubDate === meta.date && ["published", "indexed"].includes(meta.kind)
    && (meta.kind !== "published" || (Number.isSafeInteger(meta.views) && Number(meta.views) >= 0))
}

export function isCurrentRumbleCache(cache: { id: string, items: NewsItem[] }, now = Date.now()) {
  return cache.id !== "rumble" || (cache.items.length > 0 && cache.items.every(item => isCurrentRumbleItem(item, now)))
}

export function selectRumblePicks(items: NewsItem[], now = Date.now()) {
  return requireItems(items.filter(item => isCurrentRumbleItem(item, now)).sort((a, b) => {
    const first = a.extra!.rumble!
    const second = b.extra!.rumble!
    return Number(second.kind === "published") - Number(first.kind === "published")
      || (second.views ?? 0) - (first.views ?? 0) || (second.date ?? 0) - (first.date ?? 0)
  }))
}
