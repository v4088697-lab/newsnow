import type { NewsItem } from "@shared/types"
import { myFetch } from "../utils/fetch"
import { fetchOfficialAggregated } from "../utils/platform-content"
import { parsePeacockRecommendations } from "../utils/streaming-content"
import { PEACOCK_CHART, parsePeacockWeekly } from "../utils/peacock-weekly"

export default async (): Promise<NewsItem[]> => {
  try {
    const html = await myFetch<string, "text">(PEACOCK_CHART, { responseType: "text", retry: 0, timeout: 4000 })
    return parsePeacockWeekly(html)
  } catch { /* Weekly chart may be unavailable or out of date. */ }
  let updates
  try {
    const html = await myFetch<string, "text">("https://www.peacocktv.com/blog", { responseType: "text", retry: 0, timeout: 3000 })
    updates = parsePeacockRecommendations(html).map(item => ({ ...item, extra: { info: "Official updates" } }))
  } catch {
    updates = await fetchOfficialAggregated("site:peacocktv.com/blog", ["peacocktv.com"], "Official updates", 3000)
  }
  return updates.map(item => ({ ...item, extra: { ...item.extra, peacock: { kind: "official" as const } } }))
}
