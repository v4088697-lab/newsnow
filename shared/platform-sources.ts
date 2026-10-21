import type { OriginSource } from "./types"

export const platformSources = {
  euronews: { name: "Euronews 欧洲新闻台", title: "最新新闻", color: "blue", home: "https://www.euronews.com", column: "world", type: "hottest", desc: "Euronews 官方新闻订阅；订阅不可用时使用标注来源的新闻聚合。" },
  lemonde: { name: "Le Monde 世界报", title: "最新新闻", color: "slate", home: "https://www.lemonde.fr", column: "world", type: "hottest", desc: "Le Monde 官方新闻订阅，保留法文原标题；部分文章需要订阅。" },
  youtube: { name: "YouTube", title: "视频与动态", color: "red", home: "https://www.youtube.com", column: "world", type: "hottest", desc: "优先公开音乐视频周榜；无法获取时展示并标注 YouTube 官方动态，不代表个性化推荐。" },
  instagram: { name: "Instagram", title: "官方动态", color: "fuchsia", home: "https://www.instagram.com", column: "world", type: "hottest", desc: "Meta 官方 Instagram 新闻与产品动态，不代表用户热帖或个人信息流。" },
  facebook: { name: "Facebook", title: "官方动态", color: "blue", home: "https://www.facebook.com", column: "world", type: "hottest", desc: "Meta 官方 Facebook 新闻与产品动态，不代表用户热帖或个人信息流。" },
  dailymotion: { name: "Dailymotion", title: "热门视频", color: "blue", home: "https://www.dailymotion.com", column: "world", type: "hottest", desc: "Dailymotion 官方公开热门视频列表。" },
  rumble: { name: "Rumble", title: "官方动态", color: "lime", home: "https://rumble.com", column: "world", type: "hottest", desc: "公开推荐无法获取时，展示 Rumble 官方公司动态，并明确标注。" },
  vimeo: { name: "Vimeo", title: "编辑精选", color: "cyan", home: "https://vimeo.com", column: "world", type: "hottest", desc: "Vimeo 官方 Staff Picks 编辑精选；不可用时展示并标注官方动态。" },
  twitch: { name: "Twitch", title: "直播与动态", color: "purple", home: "https://www.twitch.tv", column: "world", type: "hottest", desc: "优先公开热门直播分类；无法获取时展示并标注 Twitch 官方动态。" },
  kick: { name: "Kick", title: "直播与动态", color: "green", home: "https://kick.com", column: "world", type: "hottest", desc: "优先公开直播分类；无法获取时展示并标注 Kick 官方动态。" },
  netflix: { name: "Netflix 奈飞", title: "全球英语剧集周榜", color: "red", home: "https://www.netflix.com", column: "world", type: "hottest", desc: "Netflix Tudum 官方最新完整周的全球英语剧集 Top 10。每条注明榜单周；地区片库可能不同。" },
  disneyplus: { name: "Disney+", title: "新作与官方动态", color: "blue", home: "https://www.disneyplus.com", column: "world", type: "hottest", desc: "Disney+ 官方新闻、新作及上线公告，不是订阅用户的个性化片单。" },
  hbomax: { name: "HBO Max", title: "新作与官方动态", color: "indigo", home: "https://www.hbomax.com", column: "world", type: "hottest", desc: "HBO Max 官方新作与平台动态；需要新闻聚合时逐条标注来源。" },
  hulu: { name: "Hulu", title: "新作与官方动态", color: "green", home: "https://www.hulu.com", column: "world", type: "hottest", desc: "Hulu 官方新闻与新作公告，部分节目和服务受地区限制。" },
  x: { name: "X", title: "官方开发者动态", color: "gray", home: "https://x.com", column: "world", type: "hottest", desc: "X 官方开发者更新日志，不代表实时热帖或热搜。" },
  quora: { name: "Quora", title: "官方博客", color: "red", home: "https://www.quora.com", column: "world", type: "hottest", desc: "Quora 官方博客及归档文章，注明文章日期与聚合来源，不代表热门问答榜。" },
} as const satisfies Record<string, OriginSource>
