import { load } from "cheerio"
import type { NewsItem } from "@shared/types"
import { plainText, requireItems, validPlatformUrl } from "./platform-content"
import { parseInternationalFeed } from "./international-feed"

const WEEK = 7 * 86400000
const POST_ID = /^(?:\d{5,30}|pfbid[A-Za-z0-9]{10,150})$/

export function facebookPostIdentity(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || !["facebook.com", "www.facebook.com"].includes(url.hostname)) return undefined
    const parts = url.pathname.split("/").filter(Boolean)
    if (parts.some(part => ["groups", "events", "login", "share", "sharer"].includes(part))) return undefined
    let id: string | undefined
    let kind: "Video" | "Post" = "Post"
    if ((parts[0] === "reel" && parts.length === 2) || (parts.length >= 3 && parts[1] === "videos")) {
      id = parts.at(-1)
      kind = "Video"
    } else if (parts[0] === "watch" && parts.length === 1) {
      id = url.searchParams.get("v") ?? undefined
      kind = "Video"
    } else if (parts.length >= 3 && ["posts", "photos"].includes(parts[1])) {
      id = parts.at(-1)
    } else if (parts[0] === "posts" && parts.length === 2) {
      id = parts[1]
    } else if (["photo.php", "photo"].includes(parts[0]) && parts.length === 1) {
      id = url.searchParams.get("fbid") ?? undefined
    } else if (["permalink.php", "story.php"].includes(parts[0]) && parts.length === 1) {
      id = url.searchParams.get("story_fbid") ?? undefined
      if (!/^\d{5,30}$/.test(url.searchParams.get("id") ?? "")) return undefined
    }
    if (!id || !POST_ID.test(id)) return undefined
    const clean = new URL(`https://www.facebook.com/${parts.join("/")}${parts.at(-1)?.endsWith(".php") ? "" : "/"}`)
    for (const key of ["v", "fbid", "story_fbid", "id"]) {
      const parameter = url.searchParams.get(key)
      if (parameter && POST_ID.test(parameter)) clean.searchParams.set(key, parameter)
    }
    return { id, kind, url: clean.href }
  } catch {
    return undefined
  }
}

export function parseFacebookDiscovery(xml: string, now = Date.now()) {
  return parseInternationalFeed(xml, ["facebook.com"], true, 100)
    .filter(item => typeof item.pubDate === "number" && item.pubDate > now - WEEK && item.pubDate <= now)
}

function metric(text: string, name: string) {
  const match = /^(\d[\d,]*(?:\.\d+)?)([KMB])? (views|reactions|likes)$/i.exec(text)
  if (!match || match[3].toLowerCase() !== name) return undefined
  const multiplier = { K: 1000, M: 1000000, B: 1000000000 }[match[2]?.toUpperCase() ?? ""] ?? 1
  const value = Number(match[1].replace(/,/g, "")) * multiplier
  return Number.isSafeInteger(value) && value >= 0 ? { value, label: `${match[1]}${match[2]?.toUpperCase() ?? ""} ${name}` } : undefined
}

export function parseFacebookPage(html: string, url: string, discovery: NewsItem, now = Date.now()): NewsItem {
  const identity = facebookPostIdentity(url)
  const indexedAt = discovery.pubDate
  if (!identity || typeof indexedAt !== "number" || indexedAt <= now - WEEK || indexedAt > now) throw new Error("Facebook post outside the seven-day discovery window")
  const $ = load(html)
  const canonical = facebookPostIdentity($("meta[property='og:url']").attr("content") ?? "")
  if (!canonical || canonical.id !== identity.id) throw new Error("Facebook public post unavailable")
  const ogTitle = plainText($("meta[property='og:title']").attr("content"))
  const metrics = ogTitle.includes("|") ? ogTitle.split("|")[0].trim().split(" · ") : []
  const reactions = metrics.map(text => metric(text, "reactions")).find(Boolean)
  const views = metrics.map(text => metric(text, "views")).find(Boolean)
  const image = $("meta[property='og:image']").attr("content")
  const thumbnail = image && validPlatformUrl(image, ["fbcdn.net", "fbsbx.com"]) ? image : undefined
  if (identity.kind === "Video" && !reactions && !views) throw new Error("Facebook public video metrics unavailable")
  if (!thumbnail) throw new Error("Facebook public image unavailable")
  const author = !ogTitle.includes("|") && ogTitle !== "Facebook" && ogTitle.length <= 80 ? ogTitle : ""
  const separator = discovery.title.indexOf("|")
  const indexedMetrics = separator > 0 ? discovery.title.slice(0, separator).trim().split(" · ") : []
  const caption = indexedMetrics.length && indexedMetrics.every(text => ["views", "reactions", "likes"].some(name => metric(text, name)))
    ? discovery.title.slice(separator + 1).trim()
    : discovery.title
  const labels = ["7-day indexed picks", identity.kind === "Video" ? "Video" : "Public post pick", reactions?.label, views?.label, `Google News date: ${new Date(indexedAt).toISOString().slice(0, 10)}`].filter(Boolean)
  return {
    id: identity.id,
    title: `${author ? `${author} — ` : ""}${caption}`,
    url: identity.url,
    extra: {
      image: thumbnail,
      info: labels.join(" · "),
      facebook: { indexedAt, reactions: reactions?.value, views: views?.value },
    },
  }
}

export function selectFacebookPosts(items: NewsItem[]) {
  const priority = (item: NewsItem) => item.extra?.facebook?.reactions !== undefined ? 2 : item.extra?.facebook?.views !== undefined ? 1 : 0
  const score = (item: NewsItem) => item.extra?.facebook?.reactions ?? item.extra?.facebook?.views ?? item.extra?.facebook?.indexedAt ?? 0
  return requireItems([...items].sort((a, b) => priority(b) - priority(a) || score(b) - score(a)))
}

export function isCurrentFacebookCache(cache: { id: string, items: NewsItem[] }, now = Date.now()) {
  return cache.id !== "facebook" || (cache.items.length > 0 && cache.items.every((item) => {
    const identity = facebookPostIdentity(item.url)
    const meta = item.extra?.facebook
    return identity?.id === item.id && identity.url === item.url && !!meta
      && meta.indexedAt > now - WEEK && meta.indexedAt <= now
      && (identity.kind !== "Video" || [meta.reactions, meta.views].some(value => Number.isSafeInteger(value) && Number(value) >= 0))
  }))
}
