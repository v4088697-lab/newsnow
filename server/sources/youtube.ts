import { myFetch } from "../utils/fetch"
import { parseYouTubeVideos, selectYouTubeVideos } from "../utils/youtube-videos"

export default async () => {
  const results = await Promise.allSettled(["music", "gaming", "entertainment", "sports", "science technology"].map(async (query) => {
    const params = new URLSearchParams({ search_query: query, sp: "CAMSBAgDEAE=", hl: "en", gl: "US" })
    const html = await myFetch<string, "text">(`https://www.youtube.com/results?${params}`, { retry: 0, timeout: 8000, responseType: "text" })
    return parseYouTubeVideos(html)
  }))
  // Partial topic failures still yield real videos. On total failure the API may
  // reuse only a compatible cache that remains within the seven-day window.
  return selectYouTubeVideos(results.flatMap(result => result.status === "fulfilled" ? result.value : []))
}
