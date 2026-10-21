import type { TikTokTrendsResponse } from "../utils/tiktok-trends"
import { TIKTOK_TREND_COUNT, parseTikTokTrends } from "../utils/tiktok-trends"
import { myFetch } from "../utils/fetch"

// Public lists are limited to three entries. Supplement the general list with
// official industry lists from the same region and time window.
const industries = [11000000000, 12000000000, 14000000000, 15000000000]

async function fetchTrends(industryID?: number) {
  const response = await myFetch<TikTokTrendsResponse>("https://ads.tiktok.com/CreativeOne/KnowledgeAPI/GetHashtagList", {
    method: "POST",
    body: { timeRange: 7, countryCode: "US", page: 1, limit: TIKTOK_TREND_COUNT, ...(industryID === undefined ? {} : { industryID }) },
    headers: { Referer: "https://ads.tiktok.com/creative/creativeCenter/trends" },
    retry: 0,
    timeout: 5000,
  })
  return parseTikTokTrends(response, industryID !== undefined)
}

export default async () => {
  const general = await fetchTrends().catch(() => [])
  if (general.length >= TIKTOK_TREND_COUNT) return general.slice(0, TIKTOK_TREND_COUNT)

  const categories = await Promise.all(industries.map(id => fetchTrends(id).catch(() => [])))
  const seenIds = new Set<string | number>()
  const seenNames = new Set<string>()
  const items = [general, ...categories].flat().filter((item) => {
    const name = item.title.normalize("NFKC").toLowerCase()
    if (seenIds.has(item.id) || seenNames.has(name)) return false
    seenIds.add(item.id)
    seenNames.add(name)
    return true
  })
  // Let the existing server cache supply a complete list during an outage.
  if (items.length < TIKTOK_TREND_COUNT) throw new Error("TikTok returned fewer than 10 distinct trends")
  return items.slice(0, TIKTOK_TREND_COUNT)
}
