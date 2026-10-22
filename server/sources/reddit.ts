import { Version } from "../../shared/consts"
import { myFetch } from "../utils/fetch"
import { fetchOfficialAggregated } from "../utils/platform-content"
import { parseRedditFeed } from "../utils/reddit-content"

export default async () => {
  try {
    const xml = await myFetch<string, "text">("https://www.reddit.com/r/popular/.rss?limit=25", {
      responseType: "text",
      retry: 0,
      timeout: 5000,
      headers: { "User-Agent": `NewsNow/${Version} (public feed reader; +https://github.com/v4088697-lab/newsnow)` },
    })
    return parseRedditFeed(xml)
  } catch {
    return fetchOfficialAggregated("site:redditinc.com/news", ["redditinc.com"], "官方动态")
  }
}
