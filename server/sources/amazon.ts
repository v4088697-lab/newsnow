import { Version } from "../../shared/consts"
import { myFetch } from "../utils/fetch"
import { fetchOfficialAggregated } from "../utils/platform-content"
import { parseAmazonBestsellers } from "../utils/shopping-content"

export default async () => {
  try {
    const html = await myFetch<string, "text">("https://www.amazon.com/Best-Sellers/zgbs", { responseType: "text", retry: 0, timeout: 5000, headers: { "User-Agent": `NewsNow/${Version}` } })
    return parseAmazonBestsellers(html)
  } catch {
    return fetchOfficialAggregated("site:aboutamazon.com/news", ["aboutamazon.com"], "官方动态")
  }
}
