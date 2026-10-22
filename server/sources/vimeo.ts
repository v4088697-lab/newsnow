import { fetchOfficialFeed } from "../utils/platform-content"

export default async () => {
  try {
    return await fetchOfficialFeed("https://vimeo.com/channels/staffpicks/videos/rss", ["vimeo.com"], "Staff Picks")
  } catch {
    return fetchOfficialFeed("https://vimeo.com/blog/feed.xml", ["vimeo.com"], "Official updates")
  }
}
