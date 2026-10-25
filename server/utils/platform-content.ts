import { load } from "cheerio"
import type { NewsItem } from "@shared/types"
import { myFetch } from "./fetch"
import { parseInternationalFeed } from "./international-feed"

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {}
}

export function plainText(value: unknown) {
  if (typeof value !== "string") return ""
  const $ = load(value)
  $("br").replaceWith(" ")
  return $.text().replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim()
}

export function validPlatformUrl(value: string, domains: string[]) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && domains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`))
  } catch {
    return false
  }
}

export function requireItems(items: NewsItem[], limit = 10) {
  const seen = new Set<string | number>()
  const result = items.filter((item) => {
    if (!item.title || !item.url || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  }).slice(0, limit)
  if (!result.length) throw new Error("No valid public platform content")
  return result
}

export interface PublicLinksOptions {
  base: string
  selector: string
  label: string
  titleSelector?: string
  path: RegExp
}

export function parsePublicLinks(html: string, options: PublicLinksOptions): NewsItem[] {
  const $ = load(html)
  const domain = new URL(options.base).hostname
  const items: NewsItem[] = []
  $(options.selector).each((_, element) => {
    const anchor = $(element)
    const href = anchor.attr("href")
    if (!href) return
    let url: URL
    try {
      url = new URL(href, options.base)
    } catch {
      return
    }
    if (!validPlatformUrl(url.href, [domain]) || !options.path.test(url.pathname)) return
    const titleNode = options.titleSelector ? anchor.find(options.titleSelector).first() : anchor
    const title = plainText(titleNode.html() ?? "")
    if (!title || title === "Post" || title.length < 3) return
    const dateText = anchor.find("time,.date").first().text()
      || anchor.closest("article").find("time,.date").first().text()
      || anchor.parent().parent().find("time,.date").first().text()
    const date = Date.parse(dateText)
    items.push({ id: url.href, title, url: url.href, pubDate: Number.isFinite(date) ? date : undefined, extra: { info: options.label } })
  })
  return requireItems(items)
}

export async function fetchPublicLinks(url: string, options: Omit<PublicLinksOptions, "base">, headers?: Record<string, string>) {
  const html = await myFetch<string, "text">(url, { responseType: "text", retry: 0, timeout: 5000, headers })
  return parsePublicLinks(html, { ...options, base: url })
}

export async function fetchOfficialFeed(url: string, domains: string[], label: string) {
  const xml = await myFetch<string, "text">(url, { responseType: "text", retry: 0, timeout: 5000 })
  return requireItems(parseInternationalFeed(xml, domains).map(item => ({ ...item, extra: { info: label } })))
}

export async function fetchOfficialAggregated(query: string, domains: string[], label: string, timeout = 5000) {
  const url = new URL("https://news.google.com/rss/search")
  url.search = new URLSearchParams({ q: query, hl: "en-US", gl: "US", ceid: "US:en" }).toString()
  const xml = await myFetch<string, "text">(url.href, { responseType: "text", retry: 0, timeout })
  return requireItems(parseInternationalFeed(xml, domains, true).map(item => ({
    ...item,
    extra: { info: `${label}${item.pubDate ? ` · ${new Date(item.pubDate).toISOString().slice(0, 10)}` : ""} · Google News` },
  })))
}
