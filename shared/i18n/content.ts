import type { Locale } from "./index"
import { translate } from "./index"

export function sourceDescription(id: string, original: string | undefined, locale: Locale) {
  if (locale === "en" || !original) return original
  let text = "Public content or labeled official updates. Not a personalized feed or a platform-wide viewing ranking."
  if (["cnn", "reuters", "apnews", "nytimes", "bbc", "guardian", "washingtonpost", "wsj", "bloomberg", "ft", "euronews", "lemonde", "zaobao"].includes(id)) text = "News from official feeds or labeled aggregation. Some articles may require a subscription."
  if (["ign", "progameguides"].includes(id)) text = "Editorial game coverage from the past 30 days. Article dates are not game launch dates or popularity rankings; Google News dates may differ from guide revisions."
  if (id === "gamefaqs") text = "Recent GameFAQs story walkthroughs from Google News, excluding side quests and collectibles. Index dates do not verify guide revisions."
  if (id === "spotify") text = "Latest complete 7-day global weekly chart: rank gains among the public top 50, excluding new entries and reentries. Not rolling 7 days or streaming growth."
  if (id === "youtube") text = "Recent video picks from YouTube's US English searches for music, gaming, entertainment, sports, science and technology, filtered to this week and sorted by public views. Up to 10 videos; not a sitewide chart or seven-day view growth. Rounded ages are checked conservatively."
  if (id === "instagram") text = "Public Reels and posts indexed by Google News within the past 7 days, ranked by visible cumulative likes from official Instagram embeds. Up to 10 recommendations; this is a sampled discovery list, not a sitewide weekly chart or seven-day like growth. Index dates do not verify original post dates. Unavailable or hidden-count posts are omitted."
  if (id === "facebook") text = "Public Facebook videos and posts indexed within 7 days by Google News. Videos with visible reactions rank first, then videos with views only, then recent post picks. Counts are cumulative and may be rounded. Up to 10; not a sitewide weekly ranking. Index dates do not verify original publication dates."
  if (id === "tiktok") text = "US TikTok trends over 7 days, including labeled category trends. Ten entries are not an overall top-ten ranking."
  if (id === "amazon") text = "US category best sellers, not sitewide ranks. Product prices and availability must be checked on the source website."
  if (id === "temu") text = "Public product categories or labeled company releases; not a sales ranking."
  if (id === "ebay") text = "Used auctions when available, otherwise labeled refurbished picks or official updates. Refurbished picks are not an auction ranking."
  if (id === "pinterest") text = "Public image Pins created within the past 7 days, discovered through Google News and verified on Pinterest. Aggregate saves rank first, then repins, then creation date. Aggregate saves are not this individual Pin's saves. Up to 10; not a sitewide weekly ranking or seven-day save growth. Pin dates can reflect a recent save of older artwork. Videos, sponsored Pins and unverified dates are omitted."
  if (id === "netflix") text = "Latest complete Netflix global English TV week. The chart date is shown; regional availability may vary."
  return `${translate(locale, text)} ${translate(locale, "Original headlines are preserved.")}`
}

export function localizeAnnotation(locale: Locale, text: string | false | undefined): string | undefined {
  if (!text) return undefined
  if (locale === "en") return text
  const t = (key: string, params?: Record<string, string | number>) => translate(locale, key, params)
  const number = (value: string) => Number(value.replace(/,/g, "")).toLocaleString(locale)
  return text.split(" · ").map((segment) => {
    const uploaded = /^Uploaded (\d+)([smhd]) ago$/.exec(segment)
    if (uploaded) {
      const unit = { s: "second", m: "minute", h: "hour", d: "day" } as const
      const time = new Intl.RelativeTimeFormat(locale).format(-Number(uploaded[1]), unit[uploaded[2] as keyof typeof unit])
      return t("Uploaded {time}", { time })
    }
    if (/^(?:Published|Google News date): /.test(segment)) {
      const [key, ...value] = segment.split(": ")
      return `${t(key)}: ${value.join(": ")}`
    }
    const gain = /^↑(\d+) places$/.exec(segment)
    if (gain) return `↑${number(gain[1])}`
    const rank = /^(Category|Rank) #(\d+)$/.exec(segment)
    if (rank) return t(rank[1] === "Category" ? "Category #{rank}" : "Rank #{rank}", { rank: number(rank[2]) })
    const compact = /^(\d[\d,]*(?:\.\d+)?)([KMB]) (views|reactions|likes)$/.exec(segment)
    if (compact) return t(`{count} ${compact[3]}`, { count: `${number(compact[1])}${compact[2]}` })
    const count = /^([\d,]+) (views|viewers|videos|likes|reactions|repins|aggregate saves)$/.exec(segment)
    if (count) return t(`{count} ${count[2]}`, { count: number(count[1]) })
    if (segment.startsWith("Listed price ")) return t("Listed price {price}", { price: segment.slice(13) })
    return t(segment).replace(/(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})/, `$1 ${t("to")} $2`)
  }).join(" · ")
}
