import process from "node:process"
import { Interval } from "./consts"
import { typeSafeObjectFromEntries } from "./type.util"
import type { OriginSource, Source, SourceID } from "./types"

const Time = {
  Test: 1,
  Realtime: 2 * 60 * 1000,
  Fast: 5 * 60 * 1000,
  Default: Interval, // 10min
  Common: 30 * 60 * 1000,
  Slow: 60 * 60 * 1000,
}

export const originSources = {
  v2ex: {
    name: "V2EX",
    color: "slate",
    home: "https://v2ex.com/",
    sub: {
      share: {
        title: "最新分享",
        column: "tech",
      },
    },
  },
  zhihu: {
    name: "知乎",
    type: "hottest",
    column: "china",
    color: "blue",
    home: "https://www.zhihu.com",
  },
  weibo: {
    name: "微博",
    title: "实时热搜",
    type: "hottest",
    column: "china",
    color: "red",
    interval: Time.Realtime,
    home: "https://weibo.com",
  },
  zaobao: {
    name: "联合早报",
    interval: Time.Common,
    type: "realtime",
    column: "world",
    color: "red",
    desc: "来自第三方网站: 早晨报",
    home: "https://www.zaobao.com",
  },
  wsj: {
    name: "The Wall Street Journal 华尔街日报",
    type: "hottest",
    column: "finance",
    color: "slate",
    title: "最新新闻",
    desc: "官方 RSS，部分文章需要订阅；订阅源不可用时使用 Google News 聚合并注明。",
    home: "https://www.wsj.com",
  },
  mktnews: {
    name: "MKTNews",
    column: "finance",
    home: "https://mktnews.net",
    color: "indigo",
    interval: Time.Realtime,
    sub: {
      flash: {
        title: "快讯",
      },
    },
  },
  wallstreetcn: {
    name: "华尔街见闻",
    color: "blue",
    column: "finance",
    home: "https://wallstreetcn.com/",
    sub: {
      quick: {
        type: "realtime",
        interval: Time.Fast,
        title: "快讯",
      },
      news: {
        title: "最新",
        interval: Time.Common,
      },
      hot: {
        title: "最热",
        type: "hottest",
        interval: Time.Common,
      },
    },
  },
  cnn: {
    name: "CNN 美国有线电视新闻网",
    type: "hottest",
    color: "red",
    home: "https://www.cnn.com",
    column: "world",
    title: "最新新闻",
    desc: "通过 Google News 聚合 CNN 新闻标题，点击查看报道。",
  },
  tiktok: {
    name: "TikTok",
    type: "hottest",
    column: "world",
    color: "gray",
    title: "美国 · 近 7 天趋势",
    desc: "TikTok 官方 Creative Center 热门话题，按官方趋势排名展示；数据不可用时显示获取失败或已有缓存。",
    home: "https://www.tiktok.com",
  },
  hupu: {
    name: "虎扑",
    home: "https://hupu.com",
    column: "sports",
    title: "主干道热帖",
    type: "hottest",
    color: "red",
  },
  dongqiudi: {
    name: "懂球帝",
    title: "头条",
    type: "realtime",
    column: "sports",
    color: "green",
    home: "https://www.dongqiudi.com",
  },
  aihot: {
    name: "AIHOT",
    type: "realtime",
    column: "tech",
    color: "blue",
    interval: Time.Fast,
    home: "https://aihot.news/all",
  },
  tieba: {
    name: "百度贴吧",
    title: "热议",
    column: "china",
    type: "hottest",
    color: "blue",
    home: "https://tieba.baidu.com",
  },
  toutiao: {
    name: "今日头条",
    type: "hottest",
    column: "china",
    color: "red",
    home: "https://www.toutiao.com",
  },
  ithome: {
    name: "IT之家",
    color: "red",
    column: "tech",
    type: "realtime",
    home: "https://www.ithome.com",
  },
  thepaper: {
    name: "澎湃新闻",
    interval: Time.Common,
    type: "hottest",
    column: "china",
    title: "热榜",
    color: "gray",
    home: "https://www.thepaper.cn",
  },
  sputniknewscn: {
    name: "卫星通讯社",
    color: "orange",
    column: "world",
    home: "https://sputniknews.cn",
  },
  cankaoxiaoxi: {
    name: "参考消息",
    color: "red",
    column: "world",
    interval: Time.Common,
    home: "https://china.cankaoxiaoxi.com",
  },
  pcbeta: {
    name: "远景论坛",
    color: "blue",
    column: "tech",
    home: "https://bbs.pcbeta.com",
    sub: {
      windows11: {
        title: "Win11",
        type: "realtime",
        interval: Time.Fast,
      },
      windows: {
        title: "Windows 资源",
        type: "realtime",
        interval: Time.Fast,
        disable: true,
      },
    },
  },
  washingtonpost: {
    name: "The Washington Post 华盛顿邮报",
    color: "slate",
    column: "world",
    home: "https://www.washingtonpost.com",
    type: "hottest",
    title: "最新新闻",
    desc: "官方 RSS，部分文章需要订阅；订阅源不可用时使用 Google News 聚合并注明。",
  },
  xueqiu: {
    name: "雪球",
    color: "blue",
    home: "https://xueqiu.com",
    column: "finance",
    sub: {
      hotstock: {
        title: "热门股票",
        interval: Time.Realtime,
        type: "hottest",
      },
    },
  },
  gelonghui: {
    name: "格隆汇",
    color: "blue",
    title: "事件",
    column: "finance",
    type: "realtime",
    interval: Time.Realtime,
    home: "https://www.gelonghui.com",
  },
  fastbull: {
    name: "法布财经",
    color: "emerald",
    home: "https://www.fastbull.cn",
    column: "finance",
    sub: {
      express: {
        title: "快讯",
        type: "realtime",
        interval: Time.Realtime,
      },
      news: {
        title: "头条",
        interval: Time.Common,
      },
    },
  },
  solidot: {
    name: "Solidot",
    color: "teal",
    column: "tech",
    home: "https://solidot.org",
    interval: Time.Slow,
  },
  hackernews: {
    name: "Hacker News",
    color: "orange",
    column: "tech",
    type: "hottest",
    home: "https://news.ycombinator.com/",
  },
  producthunt: {
    name: "Product Hunt",
    color: "red",
    column: "tech",
    type: "hottest",
    home: "https://www.producthunt.com/",
  },
  github: {
    name: "Github",
    color: "gray",
    home: "https://github.com/",
    column: "tech",
    sub: {
      "trending-today": {
        title: "Today",
        type: "hottest",
      },
    },
  },
  apnews: {
    name: "AP News 美联社",
    color: "slate",
    home: "https://apnews.com",
    column: "world",
    type: "hottest",
    title: "最新新闻",
    desc: "通过 Google News 聚合 AP News 新闻标题，点击查看报道。",
  },
  nytimes: {
    name: "The New York Times 纽约时报",
    color: "gray",
    home: "https://www.nytimes.com",
    column: "world",
    type: "hottest",
    title: "最新新闻",
    desc: "官方 RSS，部分文章需要订阅；订阅源不可用时使用 Google News 聚合并注明。",
  },
  bbc: {
    name: "BBC News 英国广播公司",
    color: "red",
    home: "https://www.bbc.com/news",
    column: "world",
    type: "hottest",
    title: "最新新闻",
    desc: "BBC 官方 RSS；订阅源不可用时使用 Google News 聚合并注明。",
  },
  kuaishou: {
    name: "快手",
    type: "hottest",
    column: "china",
    color: "orange",
    // cloudflare pages cannot access
    disable: "cf",
    home: "https://www.kuaishou.com",
  },
  kaopu: {
    name: "靠谱新闻",
    column: "world",
    color: "gray",
    interval: Time.Common,
    desc: "不一定靠谱，多看多思考",
    home: "https://kaopu.news/",
  },
  jin10: {
    name: "金十数据",
    column: "finance",
    color: "blue",
    type: "realtime",
    home: "https://www.jin10.com",
  },
  reuters: {
    name: "Reuters 路透社",
    column: "world",
    color: "orange",
    type: "hottest",
    title: "最新新闻",
    desc: "通过 Google News 聚合 Reuters 新闻标题，点击查看报道。",
    home: "https://www.reuters.com",
  },
  linuxdo: {
    name: "LINUX DO",
    column: "tech",
    color: "slate",
    home: "https://linux.do/",
    disable: true,
    sub: {
      latest: {
        title: "最新",
        home: "https://linux.do/latest",
      },
      hot: {
        title: "今日最热",
        type: "hottest",
        interval: Time.Common,
        home: "https://linux.do/hot",
      },
    },
  },
  ghxi: {
    name: "果核剥壳",
    column: "china",
    color: "yellow",
    home: "https://www.ghxi.com/",
    disable: true,
  },
  smzdm: {
    name: "什么值得买",
    column: "china",
    color: "red",
    type: "hottest",
    home: "https://www.smzdm.com",
    disable: true,
  },
  nowcoder: {
    name: "牛客",
    column: "china",
    color: "blue",
    type: "hottest",
    home: "https://www.nowcoder.com",
  },
  sspai: {
    name: "少数派",
    column: "tech",
    color: "red",
    type: "hottest",
    home: "https://sspai.com",
  },
  juejin: {
    name: "稀土掘金",
    column: "tech",
    color: "blue",
    type: "hottest",
    home: "https://juejin.cn",
  },
  ifeng: {
    name: "凤凰网",
    column: "china",
    color: "red",
    type: "hottest",
    title: "热点资讯",
    home: "https://www.ifeng.com",
  },
  guardian: {
    name: "The Guardian 卫报",
    column: "world",
    color: "blue",
    home: "https://www.theguardian.com",
    type: "hottest",
    title: "最新新闻",
    desc: "卫报官方 RSS；订阅源不可用时使用 Google News 聚合并注明。",
  },
  bloomberg: {
    name: "Bloomberg 彭博社",
    column: "finance",
    title: "最新新闻",
    color: "purple",
    type: "hottest",
    desc: "彭博官方 RSS，部分文章需要订阅；订阅源不可用时使用 Google News 聚合并注明。",
    home: "https://www.bloomberg.com",
  },
  steam: {
    name: "Steam",
    column: "world",
    title: "在线人数",
    color: "blue",
    type: "hottest",
    home: "https://store.steampowered.com",
  },
  tencent: {
    name: "腾讯新闻",
    column: "china",
    color: "blue",
    home: "https://news.qq.com",
    sub: {
      hot: {
        title: "综合早报",
        type: "hottest",
        interval: Time.Common,
        home: "https://news.qq.com/tag/aEWqxLtdgmQ=",
      },
    },
  },
  ft: {
    name: "Financial Times 金融时报",
    column: "finance",
    title: "最新新闻",
    color: "orange",
    type: "hottest",
    desc: "金融时报官方 RSS，部分文章需要订阅；订阅源不可用时使用 Google News 聚合并注明。",
    home: "https://www.ft.com",
  },

  qqvideo: {
    name: "腾讯视频",
    column: "china",
    color: "blue",
    home: "https://v.qq.com/",
    sub: {
      "tv-hotsearch": {
        title: "热搜榜",
        type: "hottest",
        interval: Time.Common,
        home: "https://v.qq.com/channel/tv",

      },
    },
  },
  iqiyi: {
    name: "爱奇艺",
    column: "china",
    color: "green",
    home: "https://www.iqiyi.com",
    sub: {
      "hot-ranklist": {
        title: "热播榜",
        type: "hottest",
        interval: Time.Common,
        home: "https://www.iqiyi.com",
      },
    },
  },
} as const satisfies Record<string, OriginSource>

export function genSources() {
  const _: [SourceID, Source][] = []

  Object.entries(originSources).forEach(([id, source]: [any, OriginSource]) => {
    const parent = {
      name: source.name,
      type: source.type,
      disable: source.disable,
      desc: source.desc,
      column: source.column,
      home: source.home,
      color: source.color ?? "primary",
      interval: source.interval ?? Time.Default,
    }
    if (source.sub && Object.keys(source.sub).length) {
      Object.entries(source.sub).forEach(([subId, subSource], i) => {
        if (i === 0) {
          _.push([
            id,
            {
              redirect: `${id}-${subId}`,
              ...parent,
              ...subSource,
            },
          ] as [any, Source])
        }
        _.push([`${id}-${subId}`, { ...parent, ...subSource }] as [
          any,
          Source,
        ])
      })
    } else {
      _.push([
        id,
        {
          title: source.title,
          ...parent,
        },
      ])
    }
  })

  return typeSafeObjectFromEntries(
    _.filter(([_, v]) => {
      if (v.disable === "cf" && process.env.CF_PAGES) {
        return false
      } else {
        return v.disable !== true
      }
    }),
  )
}
