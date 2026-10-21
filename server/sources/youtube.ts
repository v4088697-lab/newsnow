import { myFetch } from "../utils/fetch"
import { parseYouTubeCharts } from "../utils/platform-video"
import { youtubeUpdates } from "../utils/platform-updates"

export default async () => {
  try {
    const data = await myFetch("https://charts.youtube.com/youtubei/v1/browse?alt=json", {
      method: "POST",
      retry: 0,
      timeout: 5000,
      body: {
        context: { client: { clientName: "WEB_MUSIC_ANALYTICS", clientVersion: "2.0", hl: "en", gl: "US" } },
        browseId: "FEmusic_analytics_charts_home",
        query: "perspective=CHART_DETAILS&chart_params_country_code=us&chart_params_chart_type=VIDEOS&chart_params_period_type=WEEKLY",
      },
    })
    return parseYouTubeCharts(data)
  } catch {
    return youtubeUpdates()
  }
}
