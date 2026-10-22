import { myFetch } from "../utils/fetch"
import { fetchOfficialAggregated } from "../utils/platform-content"
import { parseParamountReleases } from "../utils/streaming-content"

export default async () => {
  try {
    const html = await myFetch<string, "text">("https://www.paramountpressexpress.com/paramount-plus/releases/", { responseType: "text", retry: 0, timeout: 5000 })
    return parseParamountReleases(html)
  } catch {
    return fetchOfficialAggregated("site:paramountpressexpress.com/paramount-plus", ["paramountpressexpress.com"], "Official updates")
  }
}
