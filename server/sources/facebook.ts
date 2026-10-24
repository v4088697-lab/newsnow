import { myFetch } from "../utils/fetch"
import { Version } from "../../shared/consts"
import { googleNewsLinkTicket, googleNewsResolveBody, parseGoogleNewsResolvedLinks } from "../utils/google-news-links"
import { facebookPostIdentity, parseFacebookDiscovery, parseFacebookPage, selectFacebookPosts } from "../utils/facebook-posts"

export default async () => {
  const feeds = await Promise.allSettled(["site:facebook.com/reel/", "site:facebook.com photo"].map(async (query) => {
    const params = new URLSearchParams({ q: `${query} when:7d`, hl: "en-US", gl: "US", ceid: "US:en" })
    const xml = await myFetch<string, "text">(`https://news.google.com/rss/search?${params}`, { responseType: "text", retry: 0, timeout: 2500 })
    return parseFacebookDiscovery(xml).slice(0, 8)
  }))
  const seen = new Set<string | number>()
  const candidates = feeds.flatMap(result => result.status === "fulfilled" ? result.value : []).filter(item => !seen.has(item.id) && seen.add(item.id))
  const lookups = await Promise.allSettled(candidates.map(async (item) => {
    const html = await myFetch<string, "text">(item.url, { responseType: "text", retry: 0, timeout: 3000 })
    return { item, ticket: googleNewsLinkTicket(html, item.url) }
  }))
  const tickets = lookups.flatMap(result => result.status === "fulfilled" ? [result.value] : [])
  if (!tickets.length) throw new Error("Facebook seven-day recommendations unavailable")
  const response = await myFetch<string, "text">("https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je", {
    method: "POST",
    responseType: "text",
    retry: 0,
    timeout: 2500,
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: googleNewsResolveBody(tickets.map(entry => entry.ticket)),
  })
  const links = parseGoogleNewsResolvedLinks(response, value => facebookPostIdentity(value)?.url)
  const posts = await Promise.allSettled(tickets.map(async ({ item }, index) => {
    const url = links.get(index)
    if (!url) throw new Error("Facebook post link unavailable")
    const html = await myFetch<string, "text">(url, { responseType: "text", retry: 0, timeout: 3000, headers: { "User-Agent": `NewsNow/${Version}` } })
    return parseFacebookPage(html, url, item)
  }))
  return selectFacebookPosts(posts.flatMap(result => result.status === "fulfilled" ? [result.value] : []))
}
