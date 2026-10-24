import { load } from "cheerio"
import type { CheerioAPI } from "cheerio"
import type { NewsItem } from "@shared/types"
import { asRecord, plainText, requireItems, validPlatformUrl } from "./platform-content"
import { parseInternationalFeed } from "./international-feed"

const WEEK = 7 * 86400000
const RELAY_PREFIX = "window.__PWS_RELAY_REGISTER_COMPLETED_REQUEST__("

export function pinterestPinUrl(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || !(url.hostname === "pinterest.com" || url.hostname.endsWith(".pinterest.com"))) return undefined
    const pin = /^\/pin\/(?:[^/]+--)?(\d{5,30})\/?$/.exec(url.pathname)
    return pin ? `https://www.pinterest.com/pin/${pin[1]}/` : undefined
  } catch {
    return undefined
  }
}

export function parsePinterestDiscovery(xml: string, now = Date.now()) {
  return parseInternationalFeed(xml, ["pinterest.com"], true, 100)
    .filter(item => typeof item.pubDate === "number" && item.pubDate > now - WEEK && item.pubDate <= now)
}

function publicPinData($: CheerioAPI, id: string) {
  const pins: Record<string, unknown>[] = []
  for (const element of $("script").toArray()) {
    const script = $(element).text().trim()
    if (!script.startsWith(RELAY_PREFIX) || !script.endsWith(");")) continue
    try {
      // Parse only serialized data arguments; never execute downloaded scripts.
      const args: unknown = JSON.parse(`[${script.slice(RELAY_PREFIX.length, -2)}]`)
      if (!Array.isArray(args) || typeof args[0] !== "string") continue
      const query = asRecord(JSON.parse(decodeURIComponent(args[0])))
      if (asRecord(query.variables).pinId !== id) continue
      const response = asRecord(asRecord(args[1]).data)
      for (const entry of Object.values(response)) {
        const pin = asRecord(asRecord(entry).data)
        if (pin.__typename === "Pin" && pin.entityId === id && typeof pin.createdAt === "string") pins.push(pin)
      }
    } catch {
      // Incomplete or unrelated hydration data cannot establish a Pin's age.
    }
  }
  const pin = pins.find(pin => typeof asRecord(pin.pinner).username === "string") ?? pins[0]
  if (!pin) throw new Error("Pinterest public Pin metadata unavailable")
  return pin
}

export function parsePinterestPin(html: string, url: string, discovery: NewsItem, now = Date.now()): NewsItem {
  const canonical = pinterestPinUrl(url)
  if (!canonical) throw new Error("Invalid Pinterest Pin URL")
  const id = canonical.split("/").at(-2)!
  const $ = load(html)
  if (pinterestPinUrl($("meta[property='og:url']").attr("content") ?? "") !== canonical) throw new Error("Pinterest public Pin unavailable")
  const pin = publicPinData($, id)
  const createdAt = Date.parse(pin.createdAt as string)
  if (!Number.isFinite(createdAt) || createdAt <= now - WEEK || createdAt > now) throw new Error("Pinterest Pin outside the seven-day creation window")
  if (pin.isVideo !== false || pin.videos || pin.isPromoted === true || pin.isThirdPartyAd === true || pin.adData
    || (asRecord(pin.board).privacy && asRecord(pin.board).privacy !== "public")) {
    throw new Error("Pinterest Pin is not a public organic image post")
  }
  const image = asRecord(pin.images_474x).url ?? $("meta[property='og:image']").attr("content")
  if (typeof image !== "string" || !validPlatformUrl(image, ["i.pinimg.com"])) throw new Error("Pinterest public image unavailable")
  const candidates = [pin.title, pin.gridTitle, $("meta[property='og:title']").attr("content"), pin.description, discovery.title]
  const title = candidates.map(plainText).find(value => value && !/^(?:Pinterest|Pin Creation Tool(?: - Pinterest)?)$/i.test(value))
  if (!title) throw new Error("Pinterest Pin caption unavailable")
  const author = asRecord(pin.pinner).username
  const repins = typeof pin.repinCount === "number" && Number.isSafeInteger(pin.repinCount) && pin.repinCount >= 0 ? pin.repinCount : undefined
  const saves = asRecord(asRecord(pin.aggregatedPinData).aggregatedStats).saves
  const aggregateSaves = typeof saves === "number" && Number.isSafeInteger(saves) && saves >= 0 ? saves : undefined
  return {
    id,
    title: `${typeof author === "string" && /^[\w.-]{1,60}$/.test(author) ? `@${author} — ` : ""}${title}`,
    url: canonical,
    pubDate: createdAt,
    extra: {
      image,
      info: `7-day Pin picks${aggregateSaves !== undefined ? ` · ${aggregateSaves.toLocaleString("en-US")} aggregate saves` : repins !== undefined ? ` · ${repins.toLocaleString("en-US")} repins` : ""} · Published: ${new Date(createdAt).toISOString().slice(0, 10)}`,
      pinterest: { createdAt, repins, aggregateSaves },
    },
  }
}

export function selectPinterestPins(items: NewsItem[]) {
  const priority = (item: NewsItem) => item.extra?.pinterest?.aggregateSaves !== undefined ? 2 : item.extra?.pinterest?.repins !== undefined ? 1 : 0
  const score = (item: NewsItem) => item.extra?.pinterest?.aggregateSaves ?? item.extra?.pinterest?.repins ?? -1
  return requireItems([...items].sort((a, b) => priority(b) - priority(a) || score(b) - score(a)
    || (b.extra?.pinterest?.createdAt ?? 0) - (a.extra?.pinterest?.createdAt ?? 0)))
}

export function isCurrentPinterestCache(cache: { id: string, items: NewsItem[] }, now = Date.now()) {
  return cache.id !== "pinterest" || (cache.items.length > 0 && cache.items.every((item) => {
    const pin = item.extra?.pinterest
    return !!pin && pin.createdAt > now - WEEK && pin.createdAt <= now && pinterestPinUrl(item.url) === item.url
      && item.id === item.url.split("/").at(-2) && item.pubDate === pin.createdAt
  }))
}

export function currentPinterestItems(items: NewsItem[], now = Date.now()) {
  return items.filter(item => isCurrentPinterestCache({ id: "pinterest", items: [item] }, now))
}

export function mergePinterestPins(fresh: NewsItem[], cached: NewsItem[], now = Date.now()) {
  const seen = new Set<string | number>()
  const items = currentPinterestItems([...fresh, ...cached], now).filter(item => !seen.has(item.id) && seen.add(item.id))
  return selectPinterestPins(items)
}
