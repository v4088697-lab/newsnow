import type { NewsItem } from "@shared/types"
import { parseInternationalFeed } from "./international-feed"
import { requireItems } from "./platform-content"

const WEEK = 7 * 86400000

export function quoraQuestionUrl(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || !["quora.com", "www.quora.com"].includes(url.hostname) || url.username || url.password || url.port) return undefined
    const question = /^\/([\w%-]{6,600})(?:\/answer\/[\w%-]+)?\/?$/.exec(url.pathname)?.[1]
    if (!question || !question.includes("-") || /^(?:profile|topic|search|about|contact|spaces|login|signup|settings|unanswered|answer_requests)$/i.test(question)) return undefined
    return `https://www.quora.com/${question}`
  } catch {
    return undefined
  }
}

function isQuestion(title: string) {
  return title.length >= 15 && title.length <= 600 && title.includes("?")
    && !/https?:\/\/|www\.|\b(?:customer service|support number|toll.free|whatsapp|telegram)\b|\+\d[\d\s().-]{7,}/i.test(title)
}

export function parseQuoraDiscovery(xml: string, now = Date.now()) {
  // Only the main Q&A publisher, excluding blogs, Spaces, profiles and old index entries.
  return parseInternationalFeed(xml, ["www.quora.com"], true, 100)
    .filter(item => typeof item.pubDate === "number" && item.pubDate > now - WEEK && item.pubDate <= now && isQuestion(item.title))
}

export function quoraTopic(item: NewsItem, resolvedUrl: string, now = Date.now()): NewsItem {
  const url = quoraQuestionUrl(resolvedUrl)
  const indexedAt = item.pubDate
  if (!url || typeof indexedAt !== "number" || indexedAt <= now - WEEK || indexedAt > now || !isQuestion(item.title)) throw new Error("Quora seven-day question unavailable")
  return {
    id: url,
    title: item.title,
    url,
    pubDate: indexedAt,
    extra: {
      quora: { indexedAt },
      info: `7-day indexed picks · Google News date: ${new Date(indexedAt).toISOString().slice(0, 10)}`,
    },
  }
}

export function isCurrentQuoraCache(cache: { id: string, items: NewsItem[] }, now = Date.now()) {
  return cache.id !== "quora" || (cache.items.length > 0 && cache.items.every((item) => {
    const indexedAt = item.extra?.quora?.indexedAt
    return typeof indexedAt === "number" && indexedAt > now - WEEK && indexedAt <= now
      && item.pubDate === indexedAt && item.id === item.url && quoraQuestionUrl(item.url) === item.url && isQuestion(item.title)
  }))
}

export function currentQuoraItems(items: NewsItem[], now = Date.now()) {
  return items.filter(item => isCurrentQuoraCache({ id: "quora", items: [item] }, now))
}

export function selectQuoraTopics(items: NewsItem[], now = Date.now()) {
  const titles = new Set<string>()
  return requireItems(currentQuoraItems(items, now)
    .sort((a, b) => Number(b.pubDate) - Number(a.pubDate))
    .filter((item) => {
      const key = item.title.toLocaleLowerCase("en-US").replace(/[^\p{L}\p{N}]/gu, "")
      if (titles.has(key)) return false
      titles.add(key)
      return true
    }))
}
