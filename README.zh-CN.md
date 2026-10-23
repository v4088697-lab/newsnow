![](/public/og-image.png)

[English](./README.md) | 简体中文 | [日本語](README.ja-JP.md)

***优雅地阅读实时热门新闻***

> [!NOTE]
> NewsNext（下一代 NewsNow）即将到来，快加入 [等待名单](https://tally.so/r/lbxxbo) 吧。

## 功能特性
- 右上角语言菜单支持英文（默认）、简体中文、日语、德语、法语、阿拉伯语、西班牙语、葡萄牙语、意大利语、韩语、俄语和土耳其语。选择后即时更新界面并保存至本地；支持键盘、跨标签页同步及阿拉伯语从右向左显示。界面切换不会翻译发布者的新闻或游戏标题，也不会重新抓取数据或改变收藏与排序；来源品牌名保持原样。
- 优雅的阅读界面设计，实时获取最新热点新闻
- 支持 GitHub 登录及数据同步
- 默认缓存时长为 30 分钟，登录用户可强制刷新获取最新数据
- 根据内容源更新频率动态调整抓取间隔（最快每 2 分钟），避免频繁抓取导致 IP 被封禁
- 支持 MCP server

```json
{
  "mcpServers": {
    "newsnow": {
      "command": "npx",
      "args": [
        "-y",
        "newsnow-mcp-server"
      ],
      "env": {
        "BASE_URL": "https://newsnow.busiyi.world"
      }
    }
  }
}
```

你可以将 `BASE_URL` 修改为你的域名。

## 国际媒体来源

内容卡片会按来源配置的间隔自动检查更新（默认 10 分钟），回到页面或网络恢复时也会检查；后台标签页暂停轮询。浏览器内存缓存只用于首次展示，不会阻止后续请求。服务端到达来源间隔后重新抓取，保留真实抓取时间；上游故障时沿用旧内容及其原始时间。检查成功不保证发布者新增了内容，例如周榜和灵感分类可能保持不变。

网站版本与内容更新分别处理：页面可见且联网时每 5 分钟检查新版本，回到页面或网络恢复时补查；检测到版本后 5 秒自动应用，不受更新提示框悬停或关闭影响。

原有的 36氪、百度热搜、哔哩哔哩三个分项、虫部落、财联社、酷安、豆瓣、抖音和 Freebuf 已替换为 CNN、Reuters、AP News、The New York Times、BBC News、The Guardian、The Washington Post、The Wall Street Journal、Bloomberg、TikTok 和 Financial Times。已保存的关注列表会自动迁移，合并来源时保留顺序并去重。

新闻列表按发布时间排序并保留原标题。优先使用媒体官方 RSS；CNN、Reuters、AP News 使用 Google News 聚合，其余媒体在官方订阅源不可用时也会回退到 Google News。聚合条目逐条校验发布媒体，并显示「Google News 聚合」，链接经 Google News 跳转；正文可能需要媒体订阅。

TikTok 展示官方 Creative Center 的美国区近 7 天热门话题及视频数量，链接进入对应 TikTok 话题页。公开接口每个榜单仅返回 3 条时，会补充同地区、同时间段的分类趋势，按综合榜在前、分类榜随后排列，合并去重后展示 10 条；分类条目显示「分类趋势」，不将列表序号当作综合榜前十名。旧版不足 10 条的缓存会失效；接口异常时使用已有完整缓存或显示获取失败，不生成占位趋势。

## 国际平台内容

Pro Game Guides 位于 Games 分类，展示近 30 天的游戏相关文章，优先新作动态、评测、预览及新手指南，再展示其他近期攻略，最多 10 条。优先官方 RSS，条数不足或不可用时补充明确标注的 Google News 聚合；按标题和链接去重，同标题保留官方 RSS。排除兑换码、硬件、影视及分类索引，不虚构热度或新作发售日期。标注的日期是文章发布日期或 Google News 日期，旧游戏的新活动和攻略也可能入选；并非所有条目都代表新发售游戏。支持默认 10 分钟自动检查和上游故障时的缓存保留。

IGN Guides 和 GameFAQs 位于 Games（游戏）分类，均支持收藏、搜索与默认 10 分钟自动检查。IGN Guides 展示近 30 天的游戏推荐文章和可辨认游戏名的攻略，推荐在前、攻略随后，每组按日期倒序，最多 10 条；优先官方 RSS，无法获取时使用逐条验证媒体的 Google News 聚合。它不是玩家热度排行榜。GameFAQs 展示 Google News 中近 30 天的流程攻略和主线章节，排除支线、收集品、战斗专题及讨论内容，不用旧攻略填满列表。聚合条目明确标注 Google News 日期，该日期不能证明攻略的最新修订时间或游戏发售时间；当前两站官网均存在抓取限制。上游故障时沿用已有缓存及原始抓取时间，不生成攻略或推荐。

Spotify 位于「音乐」分类，展示最新已发布完整 7 天周榜中名次上升最快的最多 10 首歌曲。数据来自 Spotify 官方公开接口，范围限定为全球周榜当前公开前 50 首，按照「上周名次 − 本周名次」降序排序，同涨幅时本周名次靠前者优先；不将新上榜、重新入榜、持平或下降歌曲伪装成涨幅。每条标注歌手、名次变化及榜单日期，点击进入 Spotify 原曲。Spotify 的统计周为周五至次周四，最新已发布周榜不等于截至今天滚动 7 天；本功能也不代表播放量增长率或完整 Top 200 的涨幅。接口异常时沿用已有缓存或提示失败，不用热歌、新闻或占位曲目替代涨幅榜。

Amazon、Temu 位于「电商」分类，eBay 位于「二手拍卖」分类，均展示最多 10 条内容并支持自动检查。Amazon 使用美国站分类畅销商品并注明分类及分类排名，不是全站总榜；Temu 展示真实官方商品分类入口，不伪造热销商品。eBay 优先二手藏品拍卖，访问受限时回退到明确标注的官方翻新推荐，不将推荐当作拍卖榜。商品链接去除跟踪参数，价格仅为抓取时页面价格，以原商品页为准。

Amazon 和 eBay 的最终回退为注明日期的官方动态聚合；Temu 分类不可用时使用 Temu 在 PR Newswire 发布的公司新闻稿，并明确标注发布渠道。

Reddit 位于「兴趣」分类，同时出现在最热、更新及来源搜索中。优先读取 r/popular 官方公开 RSS，按原始顺序合并去重后展示最多 10 条讨论，标注所属社区及「公开热门 · 官方 RSS」；点击进入原帖，不虚构点赞或评论数。订阅不可用时回退到注明文章日期的 Reddit 官方动态聚合。沿用各来源默认 10 分钟的自动检查。

Pinterest 位于「图文」分类，同时出现在最热、更新及来源搜索中。展示公开灵感页的真实缩略图和原标题，优先精选、随后灵感分类，合并去重后最多 10 条；分别标注「公开精选」「精选合作专题」「灵感分类」，不将列表当作人气排名。公开页不可用时回退到标注的 Pinterest 官方动态；图片使用官方 CDN，点击进入原始页面。

虎扑、凤凰网、爱奇艺、稀土掘金、快手、牛客、腾讯视频、少数派、腾讯新闻、澎湃新闻、百度贴吧、今日头条、华尔街见闻、微博、雪球、知乎依次替换为 Euronews、Le Monde、YouTube、Instagram、Facebook、Dailymotion、Rumble、Vimeo、Twitch、Kick、Netflix、Disney+、Paramount+、Peacock、X、Quora。原关注及排序自动迁移，原平台的多个子项合并去重。已保存的 HBO Max、Hulu 也分别迁移至 Paramount+、Peacock。

优先使用公开热门或推荐内容，无法获取时显示并标注官方动态：

| 来源 | 实际展示内容 |
| --- | --- |
| Euronews、Le Monde | 官方新闻 RSS，保留原文；必要时使用注明来源的新闻聚合 |
| YouTube | 美国音乐视频周榜，标注真实排名及榜单日期；不可用时显示官方动态 |
| Dailymotion | 公开热门视频及观看次数 |
| Vimeo | 官方 Staff Picks 编辑精选；不可用时显示官方博客 |
| Twitch | 按观看人数排列的公开热门直播分类；不可用时显示官方动态 |
| Kick | 公开直播分类；不可用时显示官方动态，不将列表序号当作人气排名 |
| Netflix | 最新完整周的全球英语剧集 Top 10，注明榜单周；链接进入官方片名搜索 |
| Instagram、Facebook | Meta 官方产品动态 |
| Rumble、Disney+ | 官方公司动态或新作公告 |
| Paramount+ | 官方新作、预告及上线公告；不可用时使用注明日期的官方新闻聚合 |
| Peacock | 官方博客热门及推荐内容，分别标注；不可用时使用注明日期的官方动态聚合 |
| X | 官方开发者更新日志，明确标注内容类型 |
| Quora | 官方博客文章（含归档），经 Google News 聚合，逐条标注实际文章日期 |

不生成占位热帖或伪造榜单；官方动态不代表用户的个性化信息流。来源异常时沿用原有缓存和错误提示。部分正文或视频需要平台订阅，且可能有地区限制。

## 部署指南

### 基础部署
无需登录和缓存功能时，可直接部署至 Cloudflare Pages 或 Vercel：
1. Fork 本仓库
2. 导入至目标平台

### Cloudflare Pages 配置
- 构建命令：`pnpm run build`
- 输出目录：`dist/output/public`

### GitHub OAuth 配置
1. [创建 GitHub App](https://github.com/settings/applications/new)
2. 无需特殊权限
3. 回调 URL 设置为：`https://your-domain.com/api/oauth/github`（替换 your-domain 为实际域名）
4. 获取 Client ID 和 Client Secret

### 环境变量配置
参考 `example.env.server` 文件，本地运行时重命名为 `.env.server` 并填写以下配置：

```env
# Github Clien ID
G_CLIENT_ID=
# Github Clien Secret
G_CLIENT_SECRET=
# JWT Secret, 通常就用 Clien Secret
JWT_SECRET=
# 初始化数据库, 首次运行必须设置为 true，之后可以将其关闭
INIT_TABLE=true
# 是否启用缓存
ENABLE_CACHE=true
```

### 数据库支持
本项目主推 Cloudflare Pages 以及 Docker 部署， Vercel 需要你自行搞定数据库，其他支持的数据库可以查看 https://db0.unjs.io/connectors 。

1. 在 Cloudflare Worker 控制面板创建 D1 数据库
2. 在 `wrangler.toml` 中配置 `database_id` 和 `database_name`
3. 若无 `wrangler.toml` ，可将 `example.wrangler.toml` 重命名并修改配置
4. 重新部署生效

### Docker 部署
对于 Docker 部署，只需要项目根目录 `docker-compose.yaml` 文件，同一目录下执行
```
docker compose up
```
同样可以通过 `docker-compose.yaml` 配置环境变量。

## 开发
> [!Note]
> 需要 Node.js >= 20

```bash
corepack enable
pnpm i
pnpm dev
```

你可能想要添加数据源，请关注 `shared/sources` `server/sources`，项目类型完备，结构简单，请自行探索。

## 路线图
- 添加 **多语言支持**（英语、中文，更多语言即将推出）
- 改进 **个性化选项**（基于分类的新闻、保存的偏好设置）
- 扩展 **数据源** 以涵盖多种语言的全球新闻

## 贡献指南
~~欢迎贡献代码！您可以提交 pull request 或创建 issue 来提出功能请求和报告 bug~~

新版即将到来，当前版本将不再接受贡献。

## License

[MIT](./LICENSE) © ourongxing

## 赞赏
如果你依赖本服务，欢迎赞助以帮助它长期运行。如果需要定制或者其他帮助，也可以下列方式联系备注。

![](./screenshots/reward.gif)

<a href="https://hellogithub.com/repository/c2978695e74a423189e9ca2543ab3b36" target="_blank"><img src="https://api.hellogithub.com/v1/widgets/recommend.svg?rid=c2978695e74a423189e9ca2543ab3b36&claim_uid=SMJiFwlsKCkWf89&theme=small" alt="Featured｜HelloGitHub" /></a>
