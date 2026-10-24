import { myFetch } from "../utils/fetch"
import { Version } from "../../shared/consts"
import { instagramLinkTicket, instagramResolveBody, parseInstagramDiscovery, parseInstagramEmbed, parseInstagramResolvedLinks, selectInstagramPosts } from "../utils/instagram-posts"

export default async () => {
  const feeds = await Promise.allSettled(["reel", "p"].map(async (kind) => {
    const query = new URLSearchParams({ q: `site:instagram.com/${kind}/ when:7d`, hl: "en-US", gl: "US", ceid: "US:en" })
    const xml = await myFetch<string, "text">(`https://news.google.com/rss/search?${query}`, { responseType: "text", retry: 0, timeout: 2500 })
    return parseInstagramDiscovery(xml).slice(0, 6)
  }))
  const seen = new Set<string | number>()
  const candidates = feeds.flatMap(result => result.status === "fulfilled" ? result.value : [])
    .filter(item => !seen.has(item.id) && seen.add(item.id))
  const lookups = await Promise.allSettled(candidates.map(async (item) => {
    const html = await myFetch<string, "text">(item.url, { responseType: "text", retry: 0, timeout: 3000 })
    return { item, ticket: instagramLinkTicket(html, item.url) }
  }))
  const tickets = lookups.flatMap(result => result.status === "fulfilled" ? [result.value] : [])
  if (!tickets.length) throw new Error("Instagram seven-day recommendations unavailable")
  const resolved = await myFetch<string, "text">("https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je", {
    method: "POST",
    responseType: "text",
    retry: 0,
    timeout: 2500,
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: instagramResolveBody(tickets.map(entry => entry.ticket)),
  })
  const links = parseInstagramResolvedLinks(resolved)
  const posts = await Promise.allSettled(tickets.map(async ({ item }, index) => {
    const url = links.get(index)
    if (!url) throw new Error("Instagram post link unavailable")
    // The official public embed is intentionally available without logging in.
    // Do not request private profile data or reuse a visitor's login session.
    const html = await myFetch<string, "text">(`${url}embed/captioned/`, { responseType: "text", retry: 0, timeout: 3000, headers: { "User-Agent": `NewsNow/${Version}` } })
    return parseInstagramEmbed(html, url, item)
  }))
  return selectInstagramPosts(posts.flatMap(result => result.status === "fulfilled" ? [result.value] : []))
}
