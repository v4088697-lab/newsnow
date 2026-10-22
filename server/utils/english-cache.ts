import type { NewsItem } from "@shared/types"

// Older cache entries contain app-authored Chinese annotations. Translate these
// on read without discarding offline fallback data or changing publisher text.
const labels = [
  ["官方博客（含归档）", "Official blog (including archive)"],
  ["官方开发者动态", "Official developer updates"],
  ["官方公司动态", "Official company updates"],
  ["官方博客热门", "Popular on the official blog"],
  ["官方翻新推荐", "Official refurbished picks"],
  ["官方商品分类", "Official product categories"],
  ["官方推荐", "Official recommendations"],
  ["编辑精选", "Staff Picks"],
  ["公开直播分类", "Public live categories"],
  ["热门直播分类", "Popular live categories"],
  ["精选合作专题", "Sponsored feature"],
  ["公开精选", "Public features"],
  ["灵感分类", "Inspiration categories"],
  ["官方动态", "Official updates"],
  ["Google News 聚合", "Google News aggregation"],
  ["官方 RSS", "Official RSS"],
  ["美国近 7 天", "US · past 7 days"],
  ["分类趋势", "Category trends"],
  ["全球英语剧集周榜", "Global English TV weekly chart"],
  ["美国音乐视频周榜", "US weekly music video chart"],
  ["热门视频", "Popular videos"],
  ["二手藏品拍卖", "Used collectible auctions"],
  ["页面价格", "Listed price"],
  ["Temu 新闻稿", "Temu press release"],
  ["公开热门", "Public popular feed"],
  ["分类畅销", "Category best sellers"],
  ["全球公开前50", "Global public top 50"],
] as const

function englishAnnotation(text: string) {
  const spotify = /^Spotify 官方周榜 (\d{4}-\d{2}-\d{2}) 至 (\d{4}-\d{2}-\d{2})；上周第 (\d+) 名，本周第 (\d+) 名，上升 (\d+) 位。按公开前50首中的名次涨幅排序，同幅度时本周排名靠前者优先。$/.exec(text)
  if (spotify) return `Spotify official weekly chart, ${spotify[1]} to ${spotify[2]}. Previous rank: ${spotify[3]}; current rank: ${spotify[4]}; up ${spotify[5]} places. Ranked by position gain among the public top 50, with ties resolved by current rank.`
  const netflix = /^Netflix 官方周榜，第 (\d+) 名；点击在 Netflix 搜索片名。$/.exec(text)
  if (netflix) return `Netflix official weekly chart, rank #${netflix[1]}. Click to search for the title on Netflix.`
  // Only replace full annotation segments, not arbitrary words from a publisher.
  return text.split(" · ").map(segment => labels.find(([zh]) => segment === zh)?.[1] ?? segment
    .replace(/^↑(\d+) 位$/, "↑$1 places")
    .replace(/^分类第 (\d+) 名$/, "Category #$1")
    .replace(/^第 (\d+) 名$/, "Rank #$1")
    .replace(/^([\d,]+) 条视频$/, "$1 videos")
    .replace(/^([\d,]+) 次观看$/, "$1 views")
    .replace(/^([\d,]+) 人观看$/, "$1 viewers")
    .replace(/^页面价格 (.+)$/, "Listed price $1")
    .replace(/^(\d{4}-\d{2}-\d{2})～(\d{4}-\d{2}-\d{2})$/, "$1 to $2")).join(" · ")
}

export function englishCacheItems(items: NewsItem[]): NewsItem[] {
  return items.map(item => item.extra
    ? { ...item, extra: { ...item.extra, ...(item.extra.info ? { info: englishAnnotation(item.extra.info) } : {}), ...(item.extra.hover ? { hover: englishAnnotation(item.extra.hover) } : {}) } }
    : item)
}
