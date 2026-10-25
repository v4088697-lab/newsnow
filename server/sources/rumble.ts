import { rumbleUpdates } from "../utils/platform-updates"
import { myFetch } from "../utils/fetch"
import { googleNewsLinkTicket, googleNewsResolveBody, parseGoogleNewsResolvedLinks } from "../utils/google-news-links"
import { parseRumbleDiscovery, parseRumbleVideos, rumbleIndexedPick, rumbleVideoUrl, selectRumblePicks } from "../utils/rumble-content"

async function discoverVideos() {
  const query = new URLSearchParams({ q: "site:rumble.com when:7d", hl: "en-US", gl: "US", ceid: "US:en" })
  const xml = await myFetch<string, "text">(`https://news.google.com/rss/search?${query}`, { responseType: "text", retry: 0, timeout: 2500 })
  const candidates = parseRumbleDiscovery(xml).slice(0, 20)
  const lookups = await Promise.allSettled(candidates.map(async item => ({
    item,
    ticket: googleNewsLinkTicket(await myFetch<string, "text">(item.url, { responseType: "text", retry: 0, timeout: 2000 }), item.url),
  })))
  const tickets = lookups.flatMap(result => result.status === "fulfilled" ? [result.value] : [])
  if (!tickets.length) throw new Error("Rumble recent discovery unavailable")
  const response = await myFetch<string, "text">("https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je", {
    method: "POST",
    responseType: "text",
    retry: 0,
    timeout: 2500,
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: googleNewsResolveBody(tickets.map(entry => entry.ticket)),
  })
  const links = parseGoogleNewsResolvedLinks(response, rumbleVideoUrl)
  return selectRumblePicks(tickets.flatMap(({ item }, index) => {
    const url = links.get(index)
    return url ? [rumbleIndexedPick(item, url)] : []
  }))
}

export default async () => {
  const results = await Promise.allSettled([
    myFetch<string, "text">("https://rumble.com/videos?date=this-week&sort=views", { responseType: "text", retry: 0, timeout: 2500 }).then(html => parseRumbleVideos(html)),
    discoverVideos(),
  ])
  const videos = results.flatMap(result => result.status === "fulfilled" ? result.value : [])
  if (videos.length) return selectRumblePicks(videos)
  return (await rumbleUpdates()).map(item => ({ ...item, extra: { ...item.extra, rumble: { kind: "official" as const } } }))
}
