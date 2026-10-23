import type { Locale } from "./index"
import { translate } from "./index"

export function sourceDescription(id: string, original: string | undefined, locale: Locale) {
  if (locale === "en" || !original) return original
  let text = "Public content or labeled official updates. Not a personalized feed or a platform-wide viewing ranking."
  if (["cnn", "reuters", "apnews", "nytimes", "bbc", "guardian", "washingtonpost", "wsj", "bloomberg", "ft", "euronews", "lemonde", "zaobao"].includes(id)) text = "News from official feeds or labeled aggregation. Some articles may require a subscription."
  if (["ign", "progameguides"].includes(id)) text = "Editorial game coverage from the past 30 days. Article dates are not game launch dates or popularity rankings; Google News dates may differ from guide revisions."
  if (id === "gamefaqs") text = "Recent GameFAQs story walkthroughs from Google News, excluding side quests and collectibles. Index dates do not verify guide revisions."
  if (id === "spotify") text = "Latest complete 7-day global weekly chart: rank gains among the public top 50, excluding new entries and reentries. Not rolling 7 days or streaming growth."
  if (id === "tiktok") text = "US TikTok trends over 7 days, including labeled category trends. Ten entries are not an overall top-ten ranking."
  if (id === "amazon") text = "US category best sellers, not sitewide ranks. Product prices and availability must be checked on the source website."
  if (id === "temu") text = "Public product categories or labeled company releases; not a sales ranking."
  if (id === "ebay") text = "Used auctions when available, otherwise labeled refurbished picks or official updates. Refurbished picks are not an auction ranking."
  if (id === "pinterest") text = "Public featured content and inspiration categories, including labeled sponsored content. Not personalized recommendations or popularity rankings."
  if (id === "netflix") text = "Latest complete Netflix global English TV week. The chart date is shown; regional availability may vary."
  return `${translate(locale, text)} ${translate(locale, "Original headlines are preserved.")}`
}

export function localizeAnnotation(locale: Locale, text: string | false | undefined): string | undefined {
  if (!text) return undefined
  if (locale === "en") return text
  const t = (key: string, params?: Record<string, string | number>) => translate(locale, key, params)
  const number = (value: string) => Number(value.replace(/,/g, "")).toLocaleString(locale)
  return text.split(" · ").map((segment) => {
    if (/^(?:Published|Google News date): /.test(segment)) {
      const [key, ...value] = segment.split(": ")
      return `${t(key)}: ${value.join(": ")}`
    }
    const gain = /^↑(\d+) places$/.exec(segment)
    if (gain) return `↑${number(gain[1])}`
    const rank = /^(Category|Rank) #(\d+)$/.exec(segment)
    if (rank) return t(rank[1] === "Category" ? "Category #{rank}" : "Rank #{rank}", { rank: number(rank[2]) })
    const count = /^([\d,]+) (views|viewers|videos)$/.exec(segment)
    if (count) return t(`{count} ${count[2]}`, { count: number(count[1]) })
    if (segment.startsWith("Listed price ")) return t("Listed price {price}", { price: segment.slice(13) })
    return t(segment).replace(/(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})/, `$1 ${t("to")} $2`)
  }).join(" · ")
}
