import type { NewsItem } from "@shared/types"
import { asRecord, plainText, requireItems, validPlatformUrl } from "./platform-content"

export function parseDailymotion(data: unknown): NewsItem[] {
  const list = asRecord(data).list
  if (!Array.isArray(list)) throw new Error("Dailymotion video list unavailable")
  return requireItems(list.flatMap((entry) => {
    const video = asRecord(entry)
    if (typeof video.id !== "string" || !/^[a-z0-9]+$/i.test(video.id) || typeof video.url !== "string"
      || !validPlatformUrl(video.url, ["dailymotion.com"])) {
      return []
    }
    return [{
      id: video.id,
      title: plainText(video.title),
      url: video.url,
      pubDate: typeof video.created_time === "number" ? video.created_time * 1000 : undefined,
      extra: { info: `热门视频${typeof video.views_total === "number" ? ` · ${video.views_total.toLocaleString("en-US")} 次观看` : ""}` },
    }]
  }))
}

export function parseYouTubeCharts(data: unknown): NewsItem[] {
  const contents = asRecord(asRecord(data).contents)
  const sections = asRecord(contents.sectionListRenderer).contents
  if (!Array.isArray(sections)) throw new Error("YouTube chart unavailable")
  const items: NewsItem[] = []
  for (const section of sections) {
    const content = asRecord(asRecord(asRecord(section).musicAnalyticsSectionRenderer).content)
    const metadata = asRecord(content.perspectiveMetadata)
    const available = metadata.availableChartsInfo
    const chart = Array.isArray(available)
      ? available.find(entry => asRecord(entry).chartType === "CHART_TYPE_VIDEOS"
        && asRecord(entry).chartPeriodType === "CHART_PERIOD_TYPE_WEEKLY")
      : undefined
    const date = asRecord(chart).latestEndDate
    const groups = content.videos
    if (!Array.isArray(groups)) continue
    for (const group of groups) {
      const videos = asRecord(group).videoViews
      if (!Array.isArray(videos)) continue
      for (const entry of videos) {
        const video = asRecord(entry)
        if (typeof video.id !== "string" || !/^[\w-]{11}$/.test(video.id) || video.isAvailable === false || video.isVisible === false) continue
        const rank = asRecord(video.chartEntryMetadata).currentPosition
        items.push({
          id: video.id,
          title: plainText(video.title),
          url: `https://www.youtube.com/watch?v=${video.id}`,
          extra: { info: `美国音乐视频周榜${typeof rank === "number" ? ` · 第 ${rank} 名` : ""}${typeof date === "string" ? ` · ${date}` : ""}` },
        })
      }
    }
  }
  return requireItems(items)
}

export function parseTwitchDirectory(data: unknown): NewsItem[] {
  const edges = asRecord(asRecord(asRecord(data).data).games).edges
  if (!Array.isArray(edges)) throw new Error("Twitch public directory unavailable")
  return requireItems(edges.map(entry => asRecord(asRecord(entry).node))
    .filter(game => typeof game.id === "string" && typeof game.slug === "string" && /^[a-z0-9-]+$/.test(game.slug))
    .sort((a, b) => Number(b.viewersCount ?? 0) - Number(a.viewersCount ?? 0))
    .map(game => ({
      id: game.id as string,
      title: plainText(game.name),
      url: `https://www.twitch.tv/directory/category/${game.slug}`,
      extra: { info: `热门直播分类${typeof game.viewersCount === "number" ? ` · ${game.viewersCount.toLocaleString("en-US")} 人观看` : ""}` },
    })))
}
