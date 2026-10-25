import { myFetch } from "../utils/fetch"
import { fetchOfficialAggregated } from "../utils/platform-content"
import { parseParamountReleases } from "../utils/streaming-content"
import { matchWikipediaShows, parseDailyViews, parseParamountShows, selectParamountRisers, wikipediaTitles } from "../utils/paramount-risers"

const HEADERS = { "User-Agent": "NewsNow/0.0.43 (https://github.com/v4088697-lab/newsnow)" }
const DAY = 86400000

async function pooled<T, R>(values: T[], concurrency: number, callback: (value: T) => Promise<R>): Promise<R[]> {
  let index = 0
  const results: R[] = []
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (index < values.length) {
      const value = values[index++]
      try {
        results.push(await callback(value))
      } catch { /* Omit unavailable data, never infer missing counts. */ }
    }
  }))
  return results
}

export default async () => {
  const now = Date.now()
  const signal = AbortSignal.timeout(10000)
  try {
    const html = await myFetch<string, "text">("https://www.paramountpressexpress.com/paramount-plus/shows/", { responseType: "text", retry: 0, timeout: 3500, signal })
    const shows = parseParamountShows(html)
    const titles = wikipediaTitles(shows)
    const batches = Array.from({ length: Math.ceil(titles.length / 50) }, (_, index) => titles.slice(index * 50, index * 50 + 50))
    const matches = await pooled(batches, 4, async (batch) => {
      const query = new URLSearchParams({ action: "query", format: "json", redirects: "1", prop: "pageprops|description", titles: batch.join("|") })
      const data = await myFetch(`https://en.wikipedia.org/w/api.php?${query}`, { retry: 0, timeout: 2500, signal, headers: HEADERS })
      return matchWikipediaShows(data, shows)
    })
    const articles = new Map<string, Set<string>>()
    matches.flat().forEach(show => articles.set(show.url, new Set([...(articles.get(show.url) ?? []), show.article])))
    const candidates = [...new Map(matches.flat().filter(show => articles.get(show.url)?.size === 1).map(show => [show.url, show])).values()]
    const today = Math.floor(now / DAY) * DAY
    const stamp = (date: number) => `${new Date(date).toISOString().slice(0, 10).replaceAll("-", "")}00`
    const entries = await pooled(candidates, 6, async (show) => {
      const article = encodeURIComponent(show.article.replaceAll(" ", "_"))
      const data = await myFetch(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/user/${article}/daily/${stamp(today - 16 * DAY)}/${stamp(today - DAY)}`, { retry: 0, timeout: 2500, signal, headers: HEADERS })
      return { show, days: parseDailyViews(data, now) }
    })
    const items = selectParamountRisers(entries, now)
    if (items.length) return items
  } catch { /* Preserve explicitly labeled official news when comparison data is unavailable. */ }
  let updates
  try {
    const html = await myFetch<string, "text">("https://www.paramountpressexpress.com/paramount-plus/releases/", { responseType: "text", retry: 0, timeout: 2000 })
    updates = parseParamountReleases(html)
  } catch {
    updates = await fetchOfficialAggregated("site:paramountpressexpress.com/paramount-plus", ["paramountpressexpress.com"], "Official updates", 2000)
  }
  return updates.map(item => ({ ...item, extra: { ...item.extra, paramount: { kind: "official" as const } } }))
}
