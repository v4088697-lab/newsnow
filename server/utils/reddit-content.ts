import { XMLParser } from "fast-xml-parser"
import type { NewsItem } from "@shared/types"
import { asRecord, plainText, requireItems, validPlatformUrl } from "./platform-content"

export function parseRedditFeed(xml: string): NewsItem[] {
  const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" }).parse(xml)
  const entries = asRecord(asRecord(parsed).feed).entry
  const list = Array.isArray(entries) ? entries : entries ? [entries] : []
  const items: NewsItem[] = []
  for (const value of list) {
    const entry = asRecord(value)
    const links = Array.isArray(entry.link) ? entry.link : [entry.link]
    const link = links.map(asRecord).find(link => (!link.rel || link.rel === "alternate") && typeof link.href === "string")
    const url = typeof link?.href === "string" ? link.href : ""
    if (!validPlatformUrl(url, ["reddit.com"])) continue
    const path = new URL(url).pathname
    const match = /^\/r\/(\w+)\/comments\/([a-z0-9]+)(?:\/|$)/i.exec(path)
    const title = plainText(entry.title)
    if (!match || !title) continue
    const date = Date.parse(String(entry.published ?? entry.updated ?? ""))
    items.push({
      id: match[2],
      title,
      url,
      pubDate: Number.isFinite(date) ? date : undefined,
      extra: { info: `r/${match[1]} · Public popular feed · Official RSS` },
    })
  }
  return requireItems(items)
}
