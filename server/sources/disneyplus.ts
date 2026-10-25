import type { NewsItem } from "@shared/types"
import { disneyUpdates } from "../utils/platform-updates"
import { myFetch } from "../utils/fetch"
import { DISNEY_CHART, parseDisneyWeekly } from "../utils/disney-weekly"
import { fetchOfficialAggregated } from "../utils/platform-content"

export default async (): Promise<NewsItem[]> => {
  try {
    const html = await myFetch<string, "text">(DISNEY_CHART, { responseType: "text", retry: 0, timeout: 4000 })
    return parseDisneyWeekly(html)
  } catch { /* Do not present unavailable or stale chart data as recent recommendations. */ }
  let updates
  try {
    updates = await disneyUpdates()
  } catch {
    updates = await fetchOfficialAggregated("site:press.disneyplus.com/news", ["press.disneyplus.com"], "Official updates", 2000)
  }
  return updates.map(item => ({ ...item, extra: { ...item.extra, disneyplus: { kind: "official" as const } } }))
}
