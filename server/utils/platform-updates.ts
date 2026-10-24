import { load } from "cheerio"
import type { NewsItem } from "@shared/types"
import { Version } from "../../shared/consts"
import { myFetch } from "./fetch"
import { fetchOfficialAggregated, fetchOfficialFeed, fetchPublicLinks, plainText, requireItems } from "./platform-content"

export async function instagramUpdates() {
  return fetchOfficialFeed("https://about.fb.com/news/category/technologies/instagram/feed/", ["about.fb.com"], "Official updates")
}

export async function facebookUpdates() {
  return fetchOfficialFeed("https://about.fb.com/news/category/technologies/facebook-app/feed/", ["about.fb.com"], "Official updates")
}

export async function rumbleUpdates() {
  return fetchPublicLinks("https://www.rum.group/blog/", {
    selector: "h2 a[href*=\"/blog/\"]",
    path: /^\/blog\/[^/]+\/?$/,
    label: "Official company updates",
  })
}

export async function disneyUpdates() {
  return fetchPublicLinks("https://press.disneyplus.com/news", {
    selector: "a[href*=\"press.disneyplus.com/news/\"]",
    titleSelector: "h2",
    path: /^\/news\/[^/]+\/?$/,
    label: "Official updates",
  })
}

export async function quoraUpdates() {
  const items = await fetchOfficialAggregated("site:quorablog.quora.com", ["quorablog.quora.com"], "Official blog (including archive)")
  return requireItems(items.filter(item => !/^the quora blog$/i.test(item.title)))
}

export function parseXUpdates(html: string): NewsItem[] {
  const $ = load(html)
  return requireItems($("h3[id]").map((_, element) => {
    const id = $(element).attr("id")!
    return {
      id,
      title: plainText($(element).html() ?? ""),
      url: `https://docs.x.com/changelog#${encodeURIComponent(id)}`,
      extra: { info: "Official developer updates" },
    }
  }).get())
}

export async function xUpdates() {
  const html = await myFetch<string, "text">("https://docs.x.com/changelog", { responseType: "text", retry: 0, timeout: 5000 })
  return parseXUpdates(html)
}

export async function twitchUpdates() {
  const html = await myFetch<string, "text">("https://blog.twitch.tv/en/", { responseType: "text", retry: 0, timeout: 5000 })
  const $ = load(html)
  return requireItems($("a[href^=\"/en/20\"]").map((_, element) => {
    const anchor = $(element)
    const href = anchor.attr("href")!
    const title = plainText(anchor.parent().find("[class*=\"line-clamp\"]").first().html() ?? "") || plainText(anchor.html() ?? "")
    return { id: href, title: title === "Post" ? "" : title, url: new URL(href, "https://blog.twitch.tv").href, extra: { info: "Official updates" } }
  }).get())
}

export async function kickUpdates() {
  return fetchPublicLinks("https://about.kick.com/news-and-press/news", {
    selector: "a[href^=\"/news-and-press/\"]",
    titleSelector: "span[title]",
    path: /^\/news-and-press\/[^/]+\/?$/,
    label: "Official updates",
  }, { "User-Agent": `NewsNow/${Version}` })
}
