import { myFetch } from "../utils/fetch"
import { parseProGameGuides, selectProGameGuides } from "../utils/pro-game-guides"

export default async () => {
  let official: ReturnType<typeof parseProGameGuides> = []
  try {
    const xml = await myFetch<string, "text">("https://progameguides.com/feed/", { responseType: "text", retry: 0, timeout: 3000 })
    official = parseProGameGuides(xml)
    if (official.length >= 10) return selectProGameGuides(official)
  } catch { /* Retain publisher-verified aggregation when official RSS is unavailable. */ }
  const queries = [
    "site:progameguides.com (\"new game\" OR \"release\" OR \"review\" OR \"beginner guide\" OR \"best games\") when:30d",
    "site:progameguides.com when:30d",
    "site:progameguides.com (Minecraft OR Fortnite OR \"Genshin Impact\" OR Pokemon OR Steam) when:30d",
  ]
  const results = await Promise.allSettled(queries.map(async (q) => {
    const url = new URL("https://news.google.com/rss/search")
    url.search = new URLSearchParams({ q, hl: "en-US", gl: "US", ceid: "US:en" }).toString()
    const xml = await myFetch<string, "text">(url.href, { responseType: "text", retry: 0, timeout: 5000 })
    return parseProGameGuides(xml, true)
  }))
  return selectProGameGuides([...official, ...results.flatMap(result => result.status === "fulfilled" ? result.value : [])])
}
