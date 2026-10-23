import type { NewsItem } from "@shared/types"
import { parseInternationalFeed } from "./international-feed"
import { requireItems } from "./platform-content"

const DAY = 86400000
const excluded = /\bcodes?\b|\b(?:movies?|films?|television|headsets?|keyboards?|monitors?|laptops?|graphics cards?|gaming pc|ssds?)\b|\b(?:news\s*(?:&|and)\s*leaks|page \d+ of \d+)\b/i
const newGame = /\b(?:new games?|new releases?|release dates?|launch(?:es|ing)?|upcoming games?)\b/i
const review = /\b(?:review|preview)\b/i
const beginner = /\bbeginners?\b|\bgetting started\b|\bhow to play\b/i
const articleTitle = /\b(?:guides?|how|tips?|tricks?|best|tier lists?|locations?|quests?|events?|mutations?|seeds?|weapons?|characters?|boss(?:es)?|unlocks?|updates?|patch notes?|builds?|missions?|walkthroughs?|releases?|launch(?:es|ing)?|reviews?|previews?|announcements?)\b/i

function kind(title: string) {
  if (newGame.test(title)) return "New-game coverage"
  if (review.test(title)) return "Review & preview"
  if (beginner.test(title)) return "Getting started"
  return "Recent game guide"
}

export function parseProGameGuides(xml: string, aggregated = false, now = Date.now()): NewsItem[] {
  return parseInternationalFeed(xml, ["progameguides.com"], aggregated, 100)
    .filter((item) => {
      const date = Number(item.pubDate)
      if (!Number.isFinite(date) || date > now || date < now - 30 * DAY || excluded.test(item.title)) return false
      if (!articleTitle.test(item.title) || /^(?:Pro Game Guides|News|Guides|Reviews)$/i.test(item.title)) return false
      const years = item.title.match(/\b20\d{2}\b/g)
      if (years?.some(year => Number(year) < new Date(now).getUTCFullYear())) return false
      // Reject section, author and pagination links even if they appear in RSS.
      if (!aggregated && /^\/(?:author|category|tag|page)(?:\/|$)/.test(new URL(item.url).pathname)) return false
      return true
    })
    .map((item) => {
      const date = new Date(item.pubDate!).toISOString().slice(0, 10)
      return { ...item, extra: {
        info: `${kind(item.title)} · ${aggregated ? "Google News date" : "Published"}: ${date} · ${aggregated ? "Google News" : "Official RSS"}`,
        hover: `Pro Game Guides editorial coverage. ${aggregated ? "Date reported by Google News; guide revision date is not verified." : "Publication date reported in the official RSS feed."} Article dates are not game launch dates, and this is not a measured popularity chart.`,
      } }
    })
}

export function selectProGameGuides(items: NewsItem[]) {
  const seen = new Set<string>()
  // Official entries are supplied first and win over the same aggregated title.
  const unique = items.filter((item) => {
    const title = item.title.toLowerCase().replace(/[’‘]/g, "'").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim()
    if (seen.has(title)) return false
    seen.add(title)
    return true
  })
  const priority = (item: NewsItem) => kind(item.title) === "Recent game guide" ? 1 : 0
  const sorted = unique.sort((a, b) => priority(a) - priority(b) || Number(b.pubDate) - Number(a.pubDate))
  const topicCounts = new Map<string, number>()
  const selected: NewsItem[] = []
  const remaining: NewsItem[] = []
  for (const item of sorted) {
    const topic = /\b(?:(?:the )?hollow(?: hub)?|fortnite|minecraft|genshin impact|pok[eé]mon|roblox)\b/i.exec(item.title)?.[0].toLowerCase().replace(/^the /, "").replace(/ hub$/, "")
    if (topic && (topicCounts.get(topic) ?? 0) >= 2) {
      remaining.push(item)
    } else {
      selected.push(item)
      if (topic) topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1)
    }
  }
  return requireItems([...selected, ...remaining])
}
