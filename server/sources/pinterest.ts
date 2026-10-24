import { myFetch } from "../utils/fetch"
import { asRecord } from "../utils/platform-content"
import type { NewsItem } from "../../shared/types"
import { Version } from "../../shared/consts"
import { googleNewsLinkTicket, googleNewsResolveBody, parseGoogleNewsResolvedLinks } from "../utils/google-news-links"
import { parsePinterestDiscovery, parsePinterestPin, pinterestPinUrl, selectPinterestPins } from "../utils/pinterest-content"

export default async () => {
  const feeds = await Promise.allSettled(["site:pinterest.com/pin/", "site:pinterest.com/pin/ (decor OR fashion OR recipes OR art)"].map(async (q) => {
    const query = new URLSearchParams({ q: `${q} when:7d`, hl: "en-US", gl: "US", ceid: "US:en" })
    const xml = await myFetch<string, "text">(`https://news.google.com/rss/search?${query}`, { responseType: "text", retry: 0, timeout: 2500 })
    return parsePinterestDiscovery(xml).slice(0, 16)
  }))
  const seen = new Set<string | number>()
  const groups = feeds.flatMap(result => result.status === "fulfilled" ? [result.value] : [])
  const candidates = Array.from({ length: 16 }, (_, index) => groups.flatMap(group => group[index] ? [group[index]] : [])).flat().filter(item => !seen.has(item.id) && seen.add(item.id)).slice(0, 16)
  const lookups = await Promise.allSettled(candidates.map(async (item) => {
    const html = await myFetch<string, "text">(item.url, { responseType: "text", retry: 0, timeout: 3000 })
    return { item, ticket: googleNewsLinkTicket(html, item.url) }
  }))
  const tickets = lookups.flatMap(result => result.status === "fulfilled" ? [result.value] : [])
  if (!tickets.length) throw new Error("Pinterest seven-day recommendations unavailable")
  const response = await myFetch<string, "text">("https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je", {
    method: "POST",
    responseType: "text",
    retry: 0,
    timeout: 2500,
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: googleNewsResolveBody(tickets.map(entry => entry.ticket)),
  })
  const links = parseGoogleNewsResolvedLinks(response, pinterestPinUrl)
  const pinUrls = new Set<string>()
  const queue = tickets.flatMap(({ item }, index) => {
    const url = links.get(index)
    return url && !pinUrls.has(url) && pinUrls.add(url) ? [{ item, url }] : []
  }).slice(0, 16)
  const pins: NewsItem[] = []
  const controller = new AbortController()
  const deadline = Date.now() + 6000
  let next = 0
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (next < queue.length && Date.now() < deadline && !controller.signal.aborted) {
      const { item, url } = queue[next++]
      try {
        const html = await myFetch<string, "text">(url, { responseType: "text", retry: 0, timeout: Math.max(1, Math.min(3500, deadline - Date.now())), signal: controller.signal, headers: { "User-Agent": `NewsNow/${Version}`, "Accept-Language": "en-US,en;q=0.9" } })
        pins.push(parsePinterestPin(html, url, item))
      } catch (error) {
        if (asRecord(error).statusCode === 429 || asRecord(asRecord(error).response).status === 429) controller.abort()
        // Skip unavailable Pins; a rate limit stops the remaining public requests.
      }
    }
  }))
  return selectPinterestPins(pins)
}
