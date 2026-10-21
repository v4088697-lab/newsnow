import { myFetch } from "../utils/fetch"
import { fetchOfficialAggregated } from "../utils/platform-content"
import { parsePeacockRecommendations } from "../utils/streaming-content"

export default async () => {
  try {
    const html = await myFetch<string, "text">("https://www.peacocktv.com/blog", { responseType: "text", retry: 0, timeout: 5000 })
    return parsePeacockRecommendations(html)
  } catch {
    return fetchOfficialAggregated("site:peacocktv.com/blog", ["peacocktv.com"], "官方动态")
  }
}
