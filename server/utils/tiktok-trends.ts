import type { NewsItem } from "@shared/types"

export interface TikTokTrendsResponse {
  BaseResp?: { StatusCode?: number }
  items?: {
    hashtagID: string
    hashtagName: string
    rankIndex?: number
    publishCnt?: number
    vv?: number
  }[]
}

export function parseTikTokTrends(response: TikTokTrendsResponse): NewsItem[] {
  if (response.BaseResp?.StatusCode !== 0 || !Array.isArray(response.items)) {
    throw new Error("TikTok trends unavailable")
  }
  const seen = new Set<string>()
  const items = [...response.items].sort((a, b) => (a.rankIndex ?? Infinity) - (b.rankIndex ?? Infinity)).filter(item => item.hashtagID && item.hashtagName?.trim() && !seen.has(item.hashtagID) && seen.add(item.hashtagID)).map(item => ({
    id: item.hashtagID,
    title: `#${item.hashtagName.trim().replace(/^#/, "")}`,
    url: `https://www.tiktok.com/tag/${encodeURIComponent(item.hashtagName.trim().replace(/^#/, ""))}`,
    extra: {
      info: typeof item.publishCnt === "number" ? `${item.publishCnt.toLocaleString("en-US")} 条视频 · 美国近 7 天` : "美国近 7 天",
    },
  }))
  if (!items.length) throw new Error("TikTok returned no trending hashtags")
  return items.slice(0, 30)
}
