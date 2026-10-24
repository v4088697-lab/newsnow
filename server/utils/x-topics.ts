import type { NewsItem } from "@shared/types"
import { asRecord, plainText, requireItems } from "./platform-content"
import { parseInternationalFeed } from "./international-feed"

const WEEK = 7 * 86400000

export function xPostUrl(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password || url.port
      || !["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"].includes(url.hostname)) {
      return undefined
    }
    const post = /^\/(\w{1,15})\/status\/(\d{15,20})(?:\/(?:photo|video)\/\d+)?\/?$/.exec(url.pathname)
    return post ? `https://x.com/${post[1]}/status/${post[2]}` : undefined
  } catch {
    return undefined
  }
}

export function xPostDate(url: string) {
  const canonical = xPostUrl(url)
  if (!canonical) return undefined
  return Number((BigInt(canonical.split("/").at(-1)!) >> 22n) + 1288834974657n)
}

export function parseXDiscovery(xml: string, now = Date.now()) {
  return parseInternationalFeed(xml, ["x.com", "twitter.com"], true, 100)
    .filter(item => typeof item.pubDate === "number" && item.pubDate > now - WEEK && item.pubDate <= now)
}

export function xEmbedUrl(id: string) {
  if (!/^\d{15,20}$/.test(id)) throw new Error("Invalid X post ID")
  // Public embed endpoint used by vercel/react-tweet; this is not an account token.
  const token = (Number(id) / 1e15 * Math.PI).toString(36).replace(/0+|\./g, "")
  return `https://cdn.syndication.twimg.com/tweet-result?${new URLSearchParams({ id, lang: "en", token })}`
}

export function parseXEmbed(value: unknown, url: string, discovery: NewsItem, now = Date.now()): NewsItem {
  const canonical = xPostUrl(url)
  const id = canonical?.split("/").at(-1)
  const post = asRecord(value)
  const user = asRecord(post.user)
  const createdAt = typeof post.created_at === "string" ? Date.parse(post.created_at) : Number.NaN
  const indexedAt = discovery.pubDate
  const likes = post.favorite_count
  if (!canonical || !id || post.__typename !== "Tweet" || post.id_str !== id || user.protected === true
    || typeof user.screen_name !== "string" || !/^\w{1,15}$/.test(user.screen_name)
    || typeof indexedAt !== "number" || indexedAt <= now - WEEK || indexedAt > now
    || !Number.isFinite(createdAt) || createdAt <= now - WEEK || createdAt > now
    || Math.abs(createdAt - xPostDate(canonical)!) >= 1000
    || typeof likes !== "number" || !Number.isSafeInteger(likes) || likes < 1) {
    throw new Error("X public seven-day discussion unavailable")
  }
  const text = plainText(post.text).replace(/https?:\/\/t\.co\/\w+/g, "").replace(/\s+/g, " ").trim()
  if (text.length < 15) throw new Error("X discussion text unavailable")
  const target = `https://x.com/${user.screen_name}/status/${id}`
  return {
    id,
    url: target,
    title: `@${user.screen_name} — ${text.length > 300 ? `${text.slice(0, 299)}…` : text}`,
    pubDate: createdAt,
    extra: {
      hover: text,
      x: { createdAt, indexedAt, likes },
      info: `7-day topic picks · ${likes.toLocaleString("en-US")} likes · Published: ${new Date(createdAt).toISOString().slice(0, 10)}`,
    },
  }
}

export function isCurrentXCache(cache: { id: string, items: NewsItem[] }, now = Date.now()) {
  return cache.id !== "x" || (cache.items.length > 0 && cache.items.every((item) => {
    const meta = item.extra?.x
    return !!meta && xPostUrl(item.url) === item.url && item.id === item.url.split("/").at(-1)
      && meta.createdAt > now - WEEK && meta.createdAt <= now && item.pubDate === meta.createdAt
      && Math.abs(meta.createdAt - xPostDate(item.url)!) < 1000
      && meta.indexedAt > now - WEEK && meta.indexedAt <= now && Number.isSafeInteger(meta.likes) && meta.likes > 0
  }))
}

export function currentXItems(items: NewsItem[], now = Date.now()) {
  return items.filter(item => isCurrentXCache({ id: "x", items: [item] }, now))
}

export function selectXTopics(items: NewsItem[], now = Date.now()) {
  const ids = new Set<string | number>()
  const texts = new Set<string>()
  return requireItems(currentXItems(items, now)
    .filter(item => !ids.has(item.id) && ids.add(item.id))
    .sort((a, b) => b.extra!.x!.likes - a.extra!.x!.likes || Number(b.pubDate) - Number(a.pubDate))
    .filter((item) => {
      const key = item.title.replace(/^@\w+ — /, "").toLocaleLowerCase("en-US").replace(/[^\p{L}\p{N}]/gu, "")
      if (texts.has(key)) return false
      texts.add(key)
      return true
    }))
}
