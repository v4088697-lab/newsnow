import { XMLParser } from "fast-xml-parser"
import { load } from "cheerio"
import type { NewsItem } from "@shared/types"
import { myFetch } from "./fetch"

export const internationalFeeds = {
  cnn: { domains: ["cnn.com"], feeds: [] },
  reuters: { domains: ["reuters.com"], feeds: [] },
  apnews: { domains: ["apnews.com"], feeds: [] },
  nytimes: { domains: ["nytimes.com"], feeds: ["https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml"] },
  bbc: { domains: ["bbc.com", "bbc.co.uk"], feeds: ["https://feeds.bbci.co.uk/news/rss.xml"] },
  guardian: { domains: ["theguardian.com"], feeds: ["https://www.theguardian.com/world/rss"] },
  washingtonpost: { domains: ["washingtonpost.com"], feeds: ["https://feeds.washingtonpost.com/rss/world"] },
  wsj: { domains: ["wsj.com"], feeds: ["https://feeds.content.dowjones.io/public/rss/RSSWorldNews"] },
  bloomberg: { domains: ["bloomberg.com"], feeds: ["https://feeds.bloomberg.com/markets/news.rss"] },
  ft: { domains: ["ft.com"], feeds: ["https://www.ft.com/rss/home"] },
  euronews: { domains: ["euronews.com"], feeds: ["https://www.euronews.com/rss?level=theme&name=news"] },
  lemonde: { domains: ["lemonde.fr"], feeds: ["https://www.lemonde.fr/rss/une.xml"] },
} satisfies Record<string, { domains: string[], feeds: string[] }>

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {}
}

function text(value: unknown): string {
  if (typeof value !== "string") return text(record(value)["#text"] ?? "")
  return load(value).text().replace(/\s+/g, " ").trim()
}

function link(value: unknown): string {
  if (typeof value === "string") return value.trim()
  if (Array.isArray(value)) {
    return link(value.find(entry => record(entry).rel === "alternate") ?? value[0])
  }
  return typeof record(value).href === "string" ? record(value).href as string : ""
}

function matchesDomain(url: string, domains: string[]) {
  try {
    const parsed = new URL(url)
    return /^https?:$/.test(parsed.protocol)
      && domains.some(domain => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`))
  } catch {
    return false
  }
}

export function parseInternationalFeed(xml: string, domains: string[], aggregated = false): NewsItem[] {
  const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" }).parse(xml)
  const channel = record(record(parsed).rss).channel ?? record(parsed).feed
  const entries = record(channel).item ?? record(channel).entry
  const items = Array.isArray(entries) ? entries : entries ? [entries] : []
  const seen = new Set<string>()
  const news: NewsItem[] = []

  for (const entry of items) {
    const item = record(entry)
    let title = text(item.title)
    const url = link(item.link)
    const publisher = record(item.source)
    if (aggregated) {
      if (!matchesDomain(url, ["news.google.com"]) || !matchesDomain(link(publisher.url), domains)) continue
      const suffix = ` - ${text(item.source)}`
      if (title.endsWith(suffix)) title = title.slice(0, -suffix.length)
    } else if (!matchesDomain(url, domains)) {
      continue
    }
    if (!title || seen.has(url)) continue
    seen.add(url)
    const date = Date.parse(text(item.pubDate ?? item.updated ?? item.published))
    news.push({
      id: url,
      title,
      url,
      pubDate: Number.isFinite(date) ? date : undefined,
      extra: { info: aggregated ? "Google News aggregation" : "Official RSS" },
    })
  }

  if (!news.length) throw new Error("No valid publisher headlines in feed")
  return news.sort((a, b) => Number(b.pubDate ?? 0) - Number(a.pubDate ?? 0)).slice(0, 30)
}

export function defineInternationalFeed(id: keyof typeof internationalFeeds) {
  const { domains, feeds } = internationalFeeds[id]
  return async () => {
    for (const url of feeds) {
      try {
        const xml = await myFetch<string, "text">(url, { responseType: "text", retry: 0, timeout: 5000 })
        return parseInternationalFeed(xml, domains)
      } catch {
        // An unavailable official feed falls back to publisher-filtered headlines.
      }
    }
    const url = new URL("https://news.google.com/rss/search")
    url.searchParams.set("q", `site:${domains[0]} when:7d`)
    url.searchParams.set("hl", "en-US")
    url.searchParams.set("gl", "US")
    url.searchParams.set("ceid", "US:en")
    const xml = await myFetch<string, "text">(url.toString(), { responseType: "text", retry: 0, timeout: 7000 })
    return parseInternationalFeed(xml, domains, true)
  }
}
