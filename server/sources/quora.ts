import { myFetch } from "../utils/fetch"
import { googleNewsLinkTicket, googleNewsResolveBody, parseGoogleNewsResolvedLinks } from "../utils/google-news-links"
import { parseQuoraDiscovery, quoraQuestionUrl, quoraTopic, selectQuoraTopics } from "../utils/quora-topics"

export default async () => {
  const feeds = await Promise.allSettled([
    "site:www.quora.com (technology OR science) when:7d",
    "site:www.quora.com (travel OR life) when:7d",
    "site:www.quora.com (culture OR education OR business) when:7d",
  ].map(async (q) => {
    const query = new URLSearchParams({ q, hl: "en-US", gl: "US", ceid: "US:en" })
    const xml = await myFetch<string, "text">(`https://news.google.com/rss/search?${query}`, { responseType: "text", retry: 0, timeout: 5000 })
    return parseQuoraDiscovery(xml).slice(0, 8)
  }))
  const seen = new Set<string>()
  const candidates = feeds.flatMap(result => result.status === "fulfilled" ? result.value : [])
    .filter(item => !seen.has(item.url) && seen.add(item.url))
  // Resolve public discovery links only; do not request login pages or private Q&A data.
  const lookups = await Promise.allSettled(candidates.map(async item => ({
    item,
    ticket: googleNewsLinkTicket(await myFetch<string, "text">(item.url, { responseType: "text", retry: 0, timeout: 3000 }), item.url),
  })))
  const tickets = lookups.flatMap(result => result.status === "fulfilled" ? [result.value] : [])
  if (!tickets.length) throw new Error("Quora seven-day topics unavailable")
  const response = await myFetch<string, "text">("https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je", {
    method: "POST",
    responseType: "text",
    retry: 0,
    timeout: 3000,
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: googleNewsResolveBody(tickets.map(entry => entry.ticket)),
  })
  const links = parseGoogleNewsResolvedLinks(response, quoraQuestionUrl)
  return selectQuoraTopics(tickets.flatMap(({ item }, index) => {
    const url = links.get(index)
    if (!url) return []
    try {
      return [quoraTopic(item, url)]
    } catch {
      return []
    }
  }))
}
