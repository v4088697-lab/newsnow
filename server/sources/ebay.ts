import { Version } from "../../shared/consts"
import { myFetch } from "../utils/fetch"
import { fetchOfficialAggregated } from "../utils/platform-content"
import { parseEbayAuctions, parseEbayRefurbished } from "../utils/shopping-content"

export default async () => {
  try {
    const html = await myFetch<string, "text">("https://www.ebay.com/sch/i.html?_nkw=collectibles&LH_Auction=1&LH_ItemCondition=3000&_sop=1", { responseType: "text", retry: 0, timeout: 4000, headers: { "User-Agent": `NewsNow/${Version}` } })
    return parseEbayAuctions(html)
  } catch {
    try {
      const html = await myFetch<string, "text">("https://www.ebay.com/deals", { responseType: "text", retry: 0, timeout: 5000 })
      return parseEbayRefurbished(html)
    } catch {
      return fetchOfficialAggregated("site:ebayinc.com/stories/news", ["ebayinc.com"], "官方动态")
    }
  }
}
