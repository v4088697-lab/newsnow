import packageJSON from "../package.json"

/**
 * 默认内容刷新间隔；服务端缓存与浏览器自动轮询共同遵守。
 */
export const Interval = 10 * 60 * 1000

export const Homepage = packageJSON.homepage

export const Version = packageJSON.version
export const Author = packageJSON.author
