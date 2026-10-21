import { myFetch } from "../utils/fetch"
import { parseDailymotion } from "../utils/platform-video"

export default async () => parseDailymotion(await myFetch("https://api.dailymotion.com/videos", {
  query: { fields: "id,title,url,created_time,views_total", limit: 10, sort: "trending", family_filter: 1 },
  retry: 0,
  timeout: 5000,
}))
