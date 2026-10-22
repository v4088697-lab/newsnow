import type { NewsItem } from "@shared/types"
import { asRecord, plainText } from "./platform-content"

function chartDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return
  const timestamp = Date.parse(`${value}T00:00:00Z`)
  if (Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value) return value
}

export function parseSpotifyRisers(data: unknown): NewsItem[] {
  const charts = asRecord(data).chartEntryViewResponses
  if (!Array.isArray(charts)) throw new Error("Spotify weekly charts unavailable")
  const chart = charts.map(asRecord).filter((chart) => {
    const display = asRecord(chart.displayChart)
    const metadata = asRecord(display.chartMetadata)
    return metadata.alias === "REGIONAL_GLOBAL_WEEKLY" && metadata.entityType === "TRACK" && chartDate(display.date)
  }).sort((a, b) => String(asRecord(b.displayChart).date).localeCompare(String(asRecord(a.displayChart).date)))[0]
  if (!chart || !Array.isArray(chart.entries)) throw new Error("Spotify global weekly track chart unavailable")
  const end = chartDate(asRecord(chart.displayChart).date)!
  const start = new Date(Date.parse(`${end}T00:00:00Z`) - 6 * 86400000).toISOString().slice(0, 10)
  const ranked: { item: NewsItem, gain: number, rank: number }[] = []
  for (const value of chart.entries) {
    const entry = asRecord(value)
    const ranks = asRecord(entry.chartEntryData)
    const track = asRecord(entry.trackMetadata)
    const rank = ranks.currentRank
    const previous = ranks.previousRank
    const id = typeof track.trackUri === "string" ? /^spotify:track:([a-z0-9]{22})$/i.exec(track.trackUri)?.[1] : undefined
    const name = plainText(track.trackName)
    if (entry.missingRequiredFields || !id || !name || typeof rank !== "number" || typeof previous !== "number"
      || !Number.isInteger(rank) || rank < 1 || rank > 50 || !Number.isInteger(previous) || previous <= rank
      || (ranks.entryStatus && ranks.entryStatus !== "MOVED_UP")) {
      continue
    }
    const artists = Array.isArray(track.artists) ? track.artists.map(artist => plainText(asRecord(artist).name)).filter(Boolean).join(", ") : ""
    const gain = previous - rank
    ranked.push({
      gain,
      rank,
      item: {
        id,
        title: `${name}${artists ? ` — ${artists}` : ""}`,
        url: `https://open.spotify.com/track/${id}`,
        extra: {
          info: `↑${gain} places · ${previous}→${rank} · Global public top 50 · ${start} to ${end}`,
          hover: `Spotify official weekly chart, ${start} to ${end}. Previous rank: ${previous}; current rank: ${rank}; up ${gain} places. Ranked by position gain among the public top 50, with ties resolved by current rank.`,
        },
      },
    })
  }
  const seen = new Set<string | number>()
  const items = ranked.sort((a, b) => b.gain - a.gain || a.rank - b.rank).filter(({ item }) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  }).slice(0, 10).map(entry => entry.item)
  if (!items.length) throw new Error("No comparable rising Spotify tracks in the public weekly chart")
  return items
}
