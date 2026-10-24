import type { NewsItem } from "@shared/types"
import { myFetch } from "../utils/fetch"
import { googleNewsLinkTicket, googleNewsResolveBody, parseGoogleNewsResolvedLinks } from "../utils/google-news-links"
import { parseXDiscovery, parseXEmbed, selectXTopics, xEmbedUrl, xPostDate, xPostUrl } from "../utils/x-topics"

async function fetchTopics() {
  const deadline = AbortSignal.timeout(14000)
  const requestSignal = (timeout: number) => AbortSignal.any([deadline, AbortSignal.timeout(timeout)])
  const feeds = await Promise.allSettled([
    "site:x.com (technology OR science) when:7d",
    "site:x.com (sports OR entertainment) when:7d",
    "site:x.com (news OR culture OR travel) when:7d",
  ].map(async (q) => {
    const query = new URLSearchParams({ q, hl: "en-US", gl: "US", ceid: "US:en" })
    const xml = await myFetch<string, "text">(`https://news.google.com/rss/search?${query}`, { responseType: "text", retry: 0, signal: requestSignal(3500) })
    const items = parseXDiscovery(xml)
    // Sample across the discovery window, rather than selecting only the newest posts.
    return items.filter((_, index) => index < 4 || index % Math.max(1, Math.floor(items.length / 8)) === 0).slice(0, 12)
  }))
  const seen = new Set<string>()
  const candidates = feeds.flatMap(result => result.status === "fulfilled" ? result.value : [])
    .filter(item => !seen.has(item.url) && seen.add(item.url))
  const lookups = await Promise.allSettled(candidates.map(async item => ({
    item,
    ticket: googleNewsLinkTicket(await myFetch<string, "text">(item.url, { responseType: "text", retry: 0, signal: requestSignal(4500) }), item.url),
  })))
  const tickets = lookups.flatMap(result => result.status === "fulfilled" ? [result.value] : [])
  if (!tickets.length) throw new Error("X seven-day topics unavailable")
  const response = await myFetch<string, "text">("https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je", {
    method: "POST",
    responseType: "text",
    retry: 0,
    signal: requestSignal(3000),
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: googleNewsResolveBody(tickets.map(entry => entry.ticket)),
  })
  const links = parseGoogleNewsResolvedLinks(response, xPostUrl)
  const queue = tickets.flatMap(({ item }, index) => {
    const url = links.get(index)
    const date = url ? xPostDate(url) : undefined
    return url && date && date > Date.now() - 7 * 86400000 && date <= Date.now() ? [{ item, url }] : []
  })
  const posts: NewsItem[] = []
  let limited = false
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length && !limited && !deadline.aborted) {
      const { item, url } = queue.shift()!
      try {
        const data = await myFetch(xEmbedUrl(url.split("/").at(-1)!), { retry: 0, signal: requestSignal(3500) })
        posts.push(parseXEmbed(data, url, item))
      } catch (error: any) {
        // Stop requesting embeds when the public endpoint asks us to slow down.
        if (error?.statusCode === 429 || error?.response?.status === 429) limited = true
      }
    }
  }))
  return selectXTopics(posts)
}

let pending: Promise<NewsItem[]> | undefined
export default () => {
  pending ??= fetchTopics().finally(() => {
    pending = undefined
  })
  return pending
}
