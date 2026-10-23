import { myFetch } from "../utils/fetch"
import { parseGameFAQsWalkthroughs } from "../utils/game-guides"

export default async () => {
  const url = new URL("https://news.google.com/rss/search")
  // Filtering dates locally also handles publishers whose guide updates are
  // omitted by the search service's relative-date query filter.
  url.search = new URLSearchParams({ q: "site:gamefaqs.gamespot.com walkthrough", hl: "en-US", gl: "US", ceid: "US:en" }).toString()
  const xml = await myFetch<string, "text">(url.href, { responseType: "text", retry: 0, timeout: 8000 })
  return parseGameFAQsWalkthroughs(xml)
}
