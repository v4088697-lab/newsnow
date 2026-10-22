import process from "node:process"
import { Interval } from "./consts"
import { typeSafeObjectFromEntries } from "./type.util"
import type { OriginSource, Source, SourceID } from "./types"
import { platformSources } from "./platform-sources"

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
        title: "Latest discussions",
        column: "tech",
      },
    },
  },
  zaobao: {
    name: "Lianhe Zaobao",
    interval: Time.Common,
    type: "realtime",
    column: "world",
    color: "red",
    desc: "Via third-party provider: Zaichenbao",
    home: "https://www.zaobao.com",
  },
  wsj: {
    name: "The Wall Street Journal",
    type: "hottest",
    column: "finance",
    color: "slate",
    title: "Latest news",
    desc: "Official RSS. Some articles require a subscription. Labeled Google News aggregation is used if the feed is unavailable.",
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
        title: "Breaking news",
      },
    },
  },
  cnn: {
    name: "CNN",
    type: "hottest",
    color: "red",
    home: "https://www.cnn.com",
    column: "world",
    title: "Latest news",
    desc: "CNN headlines aggregated via Google News. Open a headline to read the report.",
  },
  tiktok: {
    name: "TikTok",
    type: "hottest",
    column: "world",
    color: "gray",
    title: "US · 7-day trends",
    desc: "Ten deduplicated US hashtag trends from the official TikTok Creative Center over the past 7 days, combining overall and labeled category trends. Existing complete cache is retained if unavailable.",
    home: "https://www.tiktok.com",
  },
  dongqiudi: {
    name: "Dongqiudi",
    title: "Headlines",
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
  ithome: {
    name: "IT Home",
    color: "red",
    column: "tech",
    type: "realtime",
    home: "https://www.ithome.com",
  },
  sputniknewscn: {
    name: "Sputnik",
    color: "orange",
    column: "world",
    home: "https://sputniknews.cn",
  },
  cankaoxiaoxi: {
    name: "Reference News",
    color: "red",
    column: "world",
    interval: Time.Common,
    home: "https://china.cankaoxiaoxi.com",
  },
  pcbeta: {
    name: "PCBeta",
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
        title: "Windows resources",
        type: "realtime",
        interval: Time.Fast,
        disable: true,
      },
    },
  },
  washingtonpost: {
    name: "The Washington Post",
    color: "slate",
    column: "world",
    home: "https://www.washingtonpost.com",
    type: "hottest",
    title: "Latest news",
    desc: "Official RSS. Some articles require a subscription. Labeled Google News aggregation is used if the feed is unavailable.",
  },
  gelonghui: {
    name: "Gelonghui",
    color: "blue",
    title: "Events",
    column: "finance",
    type: "realtime",
    interval: Time.Realtime,
    home: "https://www.gelonghui.com",
  },
  fastbull: {
    name: "FastBull",
    color: "emerald",
    home: "https://www.fastbull.cn",
    column: "finance",
    sub: {
      express: {
        title: "Breaking news",
        type: "realtime",
        interval: Time.Realtime,
      },
      news: {
        title: "Headlines",
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
    name: "AP News",
    color: "slate",
    home: "https://apnews.com",
    column: "world",
    type: "hottest",
    title: "Latest news",
    desc: "AP News headlines aggregated via Google News. Open a headline to read the report.",
  },
  nytimes: {
    name: "The New York Times",
    color: "gray",
    home: "https://www.nytimes.com",
    column: "world",
    type: "hottest",
    title: "Latest news",
    desc: "Official RSS. Some articles require a subscription. Labeled Google News aggregation is used if the feed is unavailable.",
  },
  bbc: {
    name: "BBC News",
    color: "red",
    home: "https://www.bbc.com/news",
    column: "world",
    type: "hottest",
    title: "Latest news",
    desc: "Official BBC RSS, with labeled Google News aggregation if unavailable.",
  },
  kaopu: {
    name: "Kaopu News",
    column: "world",
    color: "gray",
    interval: Time.Common,
    desc: "Read widely and think critically.",
    home: "https://kaopu.news/",
  },
  jin10: {
    name: "Jin10",
    column: "finance",
    color: "blue",
    type: "realtime",
    home: "https://www.jin10.com",
  },
  reuters: {
    name: "Reuters",
    column: "world",
    color: "orange",
    type: "hottest",
    title: "Latest news",
    desc: "Reuters headlines aggregated via Google News. Open a headline to read the report.",
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
        title: "Latest",
        home: "https://linux.do/latest",
      },
      hot: {
        title: "Trending today",
        type: "hottest",
        interval: Time.Common,
        home: "https://linux.do/hot",
      },
    },
  },
  ghxi: {
    name: "GHXI",
    column: "china",
    color: "yellow",
    home: "https://www.ghxi.com/",
    disable: true,
  },
  smzdm: {
    name: "SMZDM",
    column: "china",
    color: "red",
    type: "hottest",
    home: "https://www.smzdm.com",
    disable: true,
  },
  guardian: {
    name: "The Guardian",
    column: "world",
    color: "blue",
    home: "https://www.theguardian.com",
    type: "hottest",
    title: "Latest news",
    desc: "Official Guardian RSS, with labeled Google News aggregation if unavailable.",
  },
  bloomberg: {
    name: "Bloomberg",
    column: "finance",
    title: "Latest news",
    color: "purple",
    type: "hottest",
    desc: "Official Bloomberg RSS. Some articles require a subscription. Labeled Google News aggregation is used if unavailable.",
    home: "https://www.bloomberg.com",
  },
  steam: {
    name: "Steam",
    column: "world",
    title: "Online players",
    color: "blue",
    type: "hottest",
    home: "https://store.steampowered.com",
  },
  ft: {
    name: "Financial Times",
    column: "finance",
    title: "Latest news",
    color: "orange",
    type: "hottest",
    desc: "Official Financial Times RSS. Some articles require a subscription. Labeled Google News aggregation is used if unavailable.",
    home: "https://www.ft.com",
  },

  ...platformSources,
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
