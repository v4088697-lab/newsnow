import { myFetch } from "../utils/fetch"
import { parseIGNGuides, selectIGNGuides } from "../utils/game-guides"

export default async () => {
  let official: ReturnType<typeof parseIGNGuides> = []
  try {
    const xml = await myFetch<string, "text">("https://www.ign.com/rss/v2/articles/feed", { responseType: "text", retry: 0, timeout: 5000 })
    official = parseIGNGuides(xml)
    if (official.length >= 10) return selectIGNGuides(official)
  } catch { /* Public RSS may be unavailable; keep publisher-verified aggregation. */ }
  const queries = [
    "site:ign.com/articles (\"best games\" OR \"games to play\" OR \"games\" \"wishlist\") when:30d",
    "site:ign.com/wikis when:30d",
  ]
  const results = await Promise.allSettled(queries.map(async (q) => {
    const url = new URL("https://news.google.com/rss/search")
    url.search = new URLSearchParams({ q, hl: "en-US", gl: "US", ceid: "US:en" }).toString()
    const xml = await myFetch<string, "text">(url.href, { responseType: "text", retry: 0, timeout: 5000 })
    return parseIGNGuides(xml, true)
  }))
  return selectIGNGuides([...official, ...results.flatMap(result => result.status === "fulfilled" ? result.value : [])])
}
