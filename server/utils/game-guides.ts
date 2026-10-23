import type { NewsItem } from "@shared/types"
import { parseInternationalFeed } from "./international-feed"
import { requireItems } from "./platform-content"

const RECENT_DAYS = 30
const DAY = 86400000
const gamePicks = /\b(?:best|top|must-play)\b.+\b(?:games|rpgs|roguelikes|shooters|platformers)\b|\bgames\b.+\b(?:to play|wishlist)\b/i
const unrelated = /\b(?:movies?|films?|television|headsets?|keyboards?|monitors?|laptops?|graphics cards?|gaming pc|ssds?)\b/i
const sideContent = /\b(?:side[- ]quests?|collectibles?|trophies|achievements|combat guide|character guide|cheats?|codes|builds?|message boards?|questions? and answers?)\b/i

function recent(item: NewsItem, now: number) {
  const date = typeof item.pubDate === "number" ? item.pubDate : Date.parse(String(item.pubDate ?? ""))
  return Number.isFinite(date) && date <= now && date >= now - RECENT_DAYS * DAY
}

export function parseIGNGuides(xml: string, aggregated = false, now = Date.now()): NewsItem[] {
  const items = parseInternationalFeed(xml, ["ign.com"], aggregated, 100).filter(item => recent(item, now)).flatMap((item) => {
    const picks = gamePicks.test(item.title) && !unrelated.test(item.title)
    // Require an identifiable game name in guide titles; omit generic tips pages.
    const guide = /\s-\s(.+?) Guide$/i.exec(item.title)
    if (!picks && (!guide || /^(?:locations?(?: and)?|beginners?'?|boss(?:es)?(?: and)?|tips(?: and tricks)?)$/i.test(guide[1]) || sideContent.test(item.title))) return []
    const label = picks ? "IGN game recommendations" : "IGN game guide"
    const date = new Date(item.pubDate!).toISOString().slice(0, 10)
    return [{ ...item, extra: {
      info: `${label} · ${aggregated ? "Google News date" : "Published"}: ${date} · ${aggregated ? "Google News" : "Official RSS"}`,
      hover: aggregated ? "Date reported by Google News; the latest guide revision date is not verified. Editorial coverage, not a player popularity chart." : "Official IGN editorial coverage, not a player popularity chart.",
    } }]
  })
  // Recommendations precede guides. Each group retains newest-first feed order.
  return items.sort((a, b) => Number(!a.extra.info.startsWith("IGN game recommendations")) - Number(!b.extra.info.startsWith("IGN game recommendations")))
}

export function selectIGNGuides(items: NewsItem[]) {
  const recommendations = items.filter(item => item.extra?.info && item.extra.info.startsWith("IGN game recommendations"))
  const guides = items.filter(item => !recommendations.includes(item))
  const newestFirst = (a: NewsItem, b: NewsItem) => Number(b.pubDate) - Number(a.pubDate)
  return requireItems([...recommendations.sort(newestFirst), ...guides.sort(newestFirst)])
}

export function parseGameFAQsWalkthroughs(xml: string, now = Date.now()) {
  const items = parseInternationalFeed(xml, ["gamefaqs.gamespot.com"], true, 100)
    .filter(item => recent(item, now) && /\b(?:walkthrough|main[- ]story)\b/i.test(item.title) && !sideContent.test(item.title))
    .map((item) => {
      const date = new Date(item.pubDate!).toISOString().slice(0, 10)
      return { ...item, extra: {
        info: `Story walkthrough · Google News date: ${date} · Google News`,
        hover: "GameFAQs walkthrough or main-story chapter. Date reported by Google News; the latest guide revision date is not verified. Not a game release date or popularity ranking.",
      } }
    })
  return requireItems(items)
}
