import { load } from "cheerio"
import type { NewsItem } from "@shared/types"
import { asRecord, plainText, requireItems } from "./platform-content"

const DAY = 86400000
export type WeeklyPlatform = "peacock" | "disneyplus"
const platformNames = { peacock: "Peacock", disneyplus: "Disney+" }
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

function validPeriod(start: number, end: number, now: number) {
  const today = Math.floor(now / DAY) * DAY
  return Number.isFinite(start) && Number.isFinite(end) && end - start === 7 * DAY && end <= today && end >= today - 14 * DAY
}

function titleUrl(value: unknown) {
  try {
    const url = new URL(String(value))
    return url.origin === "https://www.showlabs.tv" && !url.username && !url.password && /^\/en\/title\/\d+-[a-z0-9-]+\/?$/.test(url.pathname)
      ? `${url.origin}${url.pathname}`
      : undefined
  } catch {
    return undefined
  }
}

export function parseShowlabsWeekly(html: string, platform: WeeklyPlatform, now = Date.now()): NewsItem[] {
  const name = platformNames[platform]
  const $ = load(html)
  const heading = $("h1").first().text().replace(/\s+/g, " ")
  if (!heading.includes(`Top 10 ${name} United States`)) throw new Error("Streaming US chart unavailable")
  const period = /(\d{1,2}) ([A-Z]+)\s*-\s*(\d{1,2}) ([A-Z]+) (\d{4})/i.exec(heading)
  if (!period) throw new Error("Streaming chart dates unavailable")
  const startMonth = months.indexOf(period[2])
  const endMonth = months.indexOf(period[4])
  const year = Number(period[5])
  if (startMonth < 0 || endMonth < 0) throw new Error("Streaming chart month invalid")
  const start = Date.UTC(year - Number(startMonth > endMonth), startMonth, Number(period[1]))
  const last = Date.UTC(year, endMonth, Number(period[3]))
  const end = last + DAY
  if (new Date(start).getUTCDate() !== Number(period[1]) || new Date(last).getUTCDate() !== Number(period[3]) || !validPeriod(start, end, now)) throw new Error("Streaming seven-day chart is stale or invalid")
  const items: NewsItem[] = []
  const ranks = new Set<number>()
  const visit = (value: unknown, depth = 0) => {
    if (depth > 5) return
    if (Array.isArray(value)) return value.forEach(entry => visit(entry, depth + 1))
    const node = asRecord(value)
    if (node["@type"] === "ItemList" && node.name === `${name} Top 10 United States` && Array.isArray(node.itemListElement)) {
      for (const entry of node.itemListElement) {
        const listItem = asRecord(entry)
        const show = asRecord(listItem.item)
        const rank = Number(listItem.position)
        const url = titleUrl(show.url)
        const title = plainText(show.name)
        // Preserve the public source rank; movies and unavailable paid metrics are excluded.
        if (show["@type"] !== "TVSeries" || !url || !title || !Number.isInteger(rank) || rank < 1 || rank > 10 || ranks.has(rank)) continue
        ranks.add(rank)
        items.push({
          id: url,
          url,
          title,
          extra: {
            [platform]: { kind: "weekly", start, end, rank },
            info: `Showlabs US weekly · Rank #${rank} · ${new Date(start).toISOString().slice(0, 10)} to ${new Date(last).toISOString().slice(0, 10)}`,
          },
        })
      }
    }
    if (node["@graph"]) visit(node["@graph"], depth + 1)
  }
  $("script[type='application/ld+json']").each((_, element) => {
    try {
      visit(JSON.parse($(element).text()))
    } catch { /* Malformed metadata cannot establish a weekly rank. */ }
  })
  return requireItems(items.sort((a, b) => a.extra![platform]!.rank! - b.extra![platform]!.rank!), 10)
}

export function isCurrentShowlabsCache(cache: { id: string, items: NewsItem[] }, platform: WeeklyPlatform, now = Date.now()) {
  if (cache.id !== platform) return true
  const first = cache.items[0]?.extra?.[platform]
  return cache.items.length > 0 && cache.items.every((item) => {
    const meta = item.extra?.[platform]
    if (meta?.kind === "official") {
      try {
        const url = new URL(item.url)
        return url.protocol === "https:" && (platform === "peacock" ? ["www.peacocktv.com", "news.google.com"] : ["press.disneyplus.com", "news.google.com"]).includes(url.hostname)
          && typeof item.extra?.info === "string" && item.extra.info.startsWith("Official updates")
      } catch {
        return false
      }
    }
    return meta?.kind === "weekly" && typeof meta.start === "number" && typeof meta.end === "number"
      && validPeriod(meta.start, meta.end, now) && meta.start === first?.start && meta.end === first?.end
      && titleUrl(item.url) === item.url && item.id === item.url && Number.isInteger(meta.rank) && Number(meta.rank) >= 1 && Number(meta.rank) <= 10
  })
}
