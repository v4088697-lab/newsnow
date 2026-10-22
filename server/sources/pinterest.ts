import { myFetch } from "../utils/fetch"
import { parsePinterestIdeas, parsePinterestUpdates } from "../utils/pinterest-content"
import { fetchOfficialAggregated } from "../utils/platform-content"
import { Version } from "../../shared/consts"

export default async () => {
  try {
    const html = await myFetch<string, "text">("https://www.pinterest.com/ideas/", { responseType: "text", retry: 0, timeout: 5000, headers: { "User-Agent": `NewsNow/${Version}` } })
    return parsePinterestIdeas(html)
  } catch {
    try {
      const html = await myFetch<string, "text">("https://newsroom.pinterest.com/en/", { responseType: "text", retry: 0, timeout: 5000 })
      return parsePinterestUpdates(html)
    } catch {
      return fetchOfficialAggregated("site:newsroom.pinterest.com/news", ["newsroom.pinterest.com"], "Official updates")
    }
  }
}
