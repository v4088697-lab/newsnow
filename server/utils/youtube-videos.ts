import { load } from "cheerio"
import type { NewsItem } from "@shared/types"
import { asRecord, plainText, requireItems } from "./platform-content"

const DAY = 86400000

function text(value: unknown): string {
  const record = asRecord(value)
  return plainText(typeof record.simpleText === "string" ? record.simpleText : Array.isArray(record.runs) ? record.runs.map(run => asRecord(run).text ?? "").join("") : "")
}

// Relative ages are rounded. Use the oldest possible upload time so cached
// recommendations cannot outlive the seven-day window. Uncertain ages are omitted.
export function parseYouTubeVideos(html: string, now = Date.now()): NewsItem[] {
  const $ = load(html)
  const script = $("script").toArray().map(element => $(element).text()).find(value => /^\s*var ytInitialData\s*=/.test(value))
  const json = script?.slice(script.indexOf("=") + 1).trim().replace(/;$/, "")
  if (!json) throw new Error("YouTube video search unavailable")
  const data = asRecord(JSON.parse(json))
  const header = asRecord(asRecord(data.header).searchHeaderRenderer)
  const button = asRecord(asRecord(header.searchFilterButton).buttonRenderer)
  const popup = asRecord(asRecord(asRecord(button.command).openPopupAction).popup)
  const groups = asRecord(popup.searchFilterOptionsDialogRenderer).groups
  const selected = Array.isArray(groups)
    ? groups.flatMap((group) => {
        const filters = asRecord(asRecord(group).searchFilterGroupRenderer).filters
        return Array.isArray(filters)
          ? filters.map(entry => asRecord(asRecord(entry).searchFilterRenderer))
              .filter(filter => filter.status === "FILTER_STATUS_SELECTED")
              .map(filter => text(filter.label))
          : []
      })
    : []
  if (!["This week", "Popularity", "Videos"].every(label => selected.includes(label))) throw new Error("YouTube weekly video filters unavailable")

  const renderer = asRecord(asRecord(data.contents).twoColumnSearchResultsRenderer)
  const sections = asRecord(asRecord(renderer.primaryContents).sectionListRenderer).contents
  const items: NewsItem[] = []
  if (Array.isArray(sections)) {
    for (const section of sections) {
      const contents = asRecord(asRecord(section).itemSectionRenderer).contents
      if (!Array.isArray(contents)) continue
      for (const entry of contents) {
        // Only ordinary video results; never ads, playlists, channels or shelves.
        const video = asRecord(asRecord(entry).videoRenderer)
        const age = text(video.publishedTimeText)
        const match = /^(\d+)\s*([smhd]|second|minute|hour|day)s? ago$/.exec(age)
        const count = /^(\d[\d,]*) views?$/.exec(text(video.viewCountText))
        if (typeof video.videoId !== "string" || !/^[\w-]{11}$/.test(video.videoId) || !match || !count
          || video.upcomingEventData || video.isLive === true) {
          continue
        }
        const badges = Array.isArray(video.badges) ? video.badges : []
        if (badges.some(badge => /LIVE|UPCOMING/i.test(String(asRecord(asRecord(badge).metadataBadgeRenderer).style)))) continue
        const unit = match[2][0]
        const multiplier = { s: 1000, m: 60000, h: 3600000, d: DAY }[unit]!
        const expiresAt = now + 7 * DAY - (Number(match[1]) + 1) * multiplier
        const views = Number(count[1].replace(/,/g, ""))
        if (expiresAt <= now || !Number.isSafeInteger(views) || views <= 0) continue
        items.push({
          id: video.videoId,
          title: text(video.title),
          url: `https://www.youtube.com/watch?v=${video.videoId}`,
          extra: {
            info: `7-day video picks · ${views.toLocaleString("en-US")} views · Uploaded ${Number(match[1])}${unit} ago`,
            youtube: { expiresAt, views },
          },
        })
      }
    }
  }
  return requireItems(items, 50)
}

export function selectYouTubeVideos(items: NewsItem[]) {
  return requireItems([...items].sort((a, b) => (b.extra?.youtube?.views ?? 0) - (a.extra?.youtube?.views ?? 0)))
}

export function isCurrentYouTubeCache(cache: { id: string, items: NewsItem[] }, now = Date.now()) {
  return cache.id !== "youtube" || (cache.items.length > 0 && cache.items.every(item =>
    typeof item.id === "string" && /^[\w-]{11}$/.test(item.id)
    && item.url === `https://www.youtube.com/watch?v=${item.id}`
    && Number.isFinite(item.extra?.youtube?.expiresAt) && item.extra!.youtube!.expiresAt > now
    && Number.isSafeInteger(item.extra?.youtube?.views) && item.extra!.youtube!.views > 0))
}
