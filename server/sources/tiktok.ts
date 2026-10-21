import type { TikTokTrendsResponse } from "../utils/tiktok-trends"
import { parseTikTokTrends } from "../utils/tiktok-trends"
import { myFetch } from "../utils/fetch"

export default async () => {
  const response = await myFetch<TikTokTrendsResponse>("https://ads.tiktok.com/CreativeOne/KnowledgeAPI/GetHashtagList", {
    method: "POST",
    body: { timeRange: 7, countryCode: "US", page: 1, limit: 20 },
    headers: { Referer: "https://ads.tiktok.com/creative/creativeCenter/trends" },
    retry: 0,
  })
  return parseTikTokTrends(response)
}
