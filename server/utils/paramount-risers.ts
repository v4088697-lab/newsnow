import { load } from "cheerio"
import type { NewsItem } from "@shared/types"
import { asRecord, plainText } from "./platform-content"

const DAY = 86400000
const BASE = "https://www.paramountpressexpress.com"
export interface ParamountShow {
  title: string
  url: string
}
export interface WikipediaShow extends ParamountShow {
  article: string
}
export interface DailyViews {
  date: number
  views: number
}
const identity = (value: string) => value.replace(/_/g, " ").replace(/\s*\([^)]*(?:TV|television) series\)$/i, "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")

export function parseParamountShows(html: string): ParamountShow[] {
  const $ = load(html)
  const shows = new Map<string, ParamountShow>()
  $("a[href*='/paramount-plus/shows/']").each((_, element) => {
    try {
      const anchor = $(element)
      const url = new URL(anchor.attr("href") ?? "", BASE)
      const title = plainText(anchor.text() || anchor.find("img").attr("alt"))
      if (url.origin !== BASE || url.username || url.password || !/^\/paramount-plus\/shows\/[a-z0-9-]+\/?$/.test(url.pathname) || !title) return
      const canonical = `${url.origin}${url.pathname.replace(/\/$/, "")}/`
      shows.set(canonical, { title, url: canonical })
    } catch { /* Ignore malformed or external catalog links. */ }
  })
  return [...shows.values()].slice(0, 400)
}

export function wikipediaTitles(shows: ParamountShow[]) {
  return [...new Set(shows.flatMap(show => [show.title, `${show.title} (TV series)`, `${show.title} (American TV series)`]))]
}

export function matchWikipediaShows(data: unknown, shows: ParamountShow[]): WikipediaShow[] {
  const pages = Object.values(asRecord(asRecord(asRecord(data).query).pages))
  const matched = new Map<string, WikipediaShow>()
  for (const value of pages) {
    const page = asRecord(value)
    const props = asRecord(page.pageprops)
    const description = String(page.description ?? props["wikibase-shortdesc"] ?? "")
    if (page.ns !== 0 || typeof page.title !== "string" || "missing" in page || "disambiguation" in props || !/\b(?:television|TV|web) series\b/i.test(description) || /\bupcoming\b/i.test(description)) continue
    const show = shows.find(show => identity(show.title) === identity(String(page.title)))
    if (show) matched.set(`${show.url}|${page.title}`, { ...show, article: page.title })
  }
  return [...matched.values()]
}

export function parseDailyViews(data: unknown, now = Date.now()): DailyViews[] {
  const days = asRecord(data).items
  if (!Array.isArray(days)) return []
  const result = new Map<number, number>()
  const today = Math.floor(now / DAY) * DAY
  for (const value of days) {
    const row = asRecord(value)
    const timestamp = String(row.timestamp ?? "")
    if (!/^\d{8}00$/.test(timestamp) || row.project !== "en.wikipedia" || row.access !== "all-access" || row.agent !== "user" || row.granularity !== "daily") continue
    const date = Date.UTC(Number(timestamp.slice(0, 4)), Number(timestamp.slice(4, 6)) - 1, Number(timestamp.slice(6, 8)))
    if (new Date(date).toISOString().slice(0, 10).replaceAll("-", "") !== timestamp.slice(0, 8) || date >= today || date < today - 16 * DAY || !Number.isSafeInteger(row.views) || Number(row.views) < 0) continue
    result.set(date, Number(row.views))
  }
  return [...result].map(([date, views]) => ({ date, views })).sort((a, b) => a.date - b.date)
}

export function selectParamountRisers(entries: { show: WikipediaShow, days: DailyViews[] }[], now = Date.now()): NewsItem[] {
  const today = Math.floor(now / DAY) * DAY
  const latest = Math.max(...entries.flatMap(entry => entry.days.map(day => day.date)))
  if (!Number.isFinite(latest) || latest < today - 2 * DAY || latest >= today) return []
  const start = latest - 6 * DAY
  const previousStart = start - 7 * DAY
  return entries.flatMap(({ show, days }) => {
    const lookup = new Map(days.map(day => [day.date, day.views]))
    const values = Array.from({ length: 14 }, (_, index) => lookup.get(previousStart + index * DAY))
    if (values.includes(undefined)) return []
    const previous = (values as number[]).slice(0, 7).reduce((a, b) => a + b, 0)
    const current = (values as number[]).slice(7).reduce((a, b) => a + b, 0)
    if (!Number.isSafeInteger(previous) || !Number.isSafeInteger(current) || previous <= 0 || current <= previous) return []
    const growth = (current - previous) / previous * 100
    const end = latest + DAY
    const date = (value: number) => new Date(value).toISOString().slice(0, 10)
    return [{
      id: show.url,
      title: show.title,
      url: show.url,
      extra: {
        paramount: { kind: "riser" as const, article: show.article, start, end, previous, current, growth },
        info: `Wikipedia attention · +${growth.toFixed(1)}% vs previous 7 days · ${current.toLocaleString("en-US")} page views · ${date(start)} to ${date(latest)} UTC`,
      },
    }]
  }).sort((a, b) => b.extra.paramount.growth - a.extra.paramount.growth || b.extra.paramount.current - a.extra.paramount.current).slice(0, 10)
}

export function isCurrentParamountCache(cache: { id: string, items: NewsItem[] }, now = Date.now()) {
  if (cache.id !== "paramountplus") return true
  return cache.items.length > 0 && cache.items.every((item) => {
    const meta = item.extra?.paramount
    if (meta?.kind === "official") return typeof item.extra?.info === "string" && item.extra.info.startsWith("Official updates")
    const today = Math.floor(now / DAY) * DAY
    return meta?.kind === "riser" && typeof meta.end === "number" && meta.end >= today - DAY && meta.end <= today
      && typeof meta.start === "number" && meta.end - meta.start === 7 * DAY
      && Number.isSafeInteger(meta.previous) && Number(meta.previous) > 0 && Number.isSafeInteger(meta.current) && Number(meta.current) > Number(meta.previous)
      && typeof meta.growth === "number" && Number.isFinite(meta.growth) && Math.abs(meta.growth - (Number(meta.current) - Number(meta.previous)) / Number(meta.previous) * 100) < 0.00001
  })
}
