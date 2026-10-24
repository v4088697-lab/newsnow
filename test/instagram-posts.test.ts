import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import instagram from "../server/sources/instagram"
import { myFetch } from "../server/utils/fetch"
import { instagramLinkTicket, instagramPostUrl, instagramResolveBody, isCurrentInstagramCache, parseInstagramDiscovery, parseInstagramEmbed, parseInstagramResolvedLinks, selectInstagramPosts } from "../server/utils/instagram-posts"

vi.mock("../server/utils/fetch", () => ({ myFetch: vi.fn() }))
const now = Date.parse("2026-10-24T12:00:00Z")
const indexedAt = now - 86400000
const article = "https://news.google.com/rss/articles/CBMireel?oc=5"
const url = "https://www.instagram.com/reel/abcdefghijk/"
const discovery = { id: article, title: "Original caption", url: article, pubDate: indexedAt }
function feed(link = article, publisher = "https://www.instagram.com", date = indexedAt) {
  return `<rss><channel><item><title>Original caption - Instagram</title><link>${link}</link><source url="${publisher}">Instagram</source><pubDate>${new Date(date).toUTCString()}</pubDate></item></channel></rss>`
}
function embed(link = url, likes = "12,345 likes", image = "https://scontent.cdninstagram.com/photo.jpg") {
  return `<a class="EmbeddedMedia" href="${link}?utm_source=ig_embed"><img class="EmbeddedMediaImage" src="${image}"></a><a class="CaptionUsername">creator</a><a data-log-event="likeCountClick">${likes}</a>`
}
function frame(index: string, link = url) {
  return ["wrb.fr", "Fbv4je", JSON.stringify(["garturlres", link, 1]), null, null, null, index]
}

describe("instagram seven-day discovery recommendations", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    vi.mocked(myFetch).mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it("requires Instagram as the indexed publisher and rejects old, future and undated entries", () => {
    expect(parseInstagramDiscovery(feed())).toMatchObject([{ title: "Original caption", pubDate: indexedAt }])
    expect(() => parseInstagramDiscovery(feed(article, "https://evil.example"))).toThrow()
    expect(parseInstagramDiscovery(feed(article, undefined, now - 7 * 86400000))).toEqual([])
    expect(parseInstagramDiscovery(feed(article, undefined, now + 1000))).toEqual([])
    expect(parseInstagramDiscovery(feed().replace(/<pubDate>[^<]+<\/pubDate>/, ""))).toEqual([])
  })

  it("pairs out-of-order batched responses by their identifiers and accepts only canonical post URLs", () => {
    const ticket = instagramLinkTicket("<c-wiz data-n-a-id=\"CBMireel\" data-n-a-ts=\"1792830000\" data-n-a-sg=\"abc-123\"></c-wiz>", article)
    expect(new URLSearchParams(instagramResolveBody([ticket])).get("f.req")).toContain("CBMireel")
    expect(() => instagramLinkTicket("<div data-n-a-id=\"other\"></div>", article)).toThrow()
    expect(() => instagramLinkTicket("", "https://evil.example/")).toThrow()
    const response = `)]}'\n\n${JSON.stringify([frame("1", "https://www.instagram.com/p/lmnopqrstuv/?utm_source=search"), frame("0"), frame("2", "https://instagram.com.evil.example/p/abcdefghijk/"), frame("3", "https://www.instagram.com/creator/")])}`
    expect([...parseInstagramResolvedLinks(response)]).toEqual([[1, "https://www.instagram.com/p/lmnopqrstuv/"], [0, url]])
    expect(instagramPostUrl("http://www.instagram.com/p/abcdefghijk/")).toBeUndefined()
    expect(instagramPostUrl("https://www.instagram.com/accounts/login/")).toBeUndefined()
  })

  it("uses real public likes and images, labels index dates and does not invent a publication date", () => {
    const item = parseInstagramEmbed(embed(), url, discovery)
    expect(item).toMatchObject({ id: "abcdefghijk", url, title: "@creator — Original caption", extra: { instagram: { indexedAt, likes: 12345 }, image: "https://scontent.cdninstagram.com/photo.jpg", info: "7-day indexed picks · Reel · 12,345 likes · Google News date: 2026-10-23" } })
    expect(item.pubDate).toBeUndefined()
    expect(parseInstagramEmbed(embed(url, "4 likes", "https://evil.example/photo.jpg"), url, discovery).extra?.image).toBeUndefined()
    expect(() => parseInstagramEmbed(embed(url, "Likes hidden"), url, discovery)).toThrow("like count unavailable")
    expect(() => parseInstagramEmbed(embed("https://www.instagram.com/reel/wrongpost01/"), url, discovery)).toThrow("embed unavailable")
    expect(() => parseInstagramEmbed(embed(), url, { ...discovery, pubDate: now - 7 * 86400000 })).toThrow("discovery window")
  })

  it("sorts by visible cumulative likes, deduplicates and caps the sampled list at ten", () => {
    const items = Array.from({ length: 12 }, (_, index) => {
      const link = `https://www.instagram.com/p/post${String(index).padStart(7, "0")}/`
      return parseInstagramEmbed(embed(link, `${index + 1} likes`), link, discovery)
    })
    expect(selectInstagramPosts([...items, ...items]).map(item => item.extra?.instagram?.likes)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3])
  })

  it("fetches official public embeds and skips unavailable posts without substituting company announcements", async () => {
    vi.mocked(myFetch).mockImplementation(async (input) => {
      const link = input.toString()
      if (link.includes("/rss/search?")) return feed() as any
      if (link === article) return "<c-wiz data-n-a-id=\"CBMireel\" data-n-a-ts=\"1792830000\" data-n-a-sg=\"abc-123\"></c-wiz>" as any
      if (link.includes("batchexecute")) return `)]}'\n${JSON.stringify([frame("0")])}` as any
      if (link.endsWith("/embed/captioned/")) return embed() as any
      throw new Error("Unexpected URL")
    })
    expect(await instagram()).toMatchObject([{ url, extra: { instagram: { likes: 12345 } } }])
    expect(vi.mocked(myFetch).mock.calls.at(-1)?.[1]).toMatchObject({ headers: { "User-Agent": expect.stringMatching(/^NewsNow\//) } })
    expect(vi.mocked(myFetch).mock.calls.every(call => !call[0].toString().includes("about.fb.com"))).toBe(true)
    vi.mocked(myFetch).mockRejectedValue(new Error("Unavailable"))
    await expect(instagram()).rejects.toThrow("recommendations unavailable")
  })

  it("invalidates legacy announcements and indexed posts after seven days", () => {
    const items = [parseInstagramEmbed(embed(), url, discovery)]
    expect(isCurrentInstagramCache({ id: "instagram", items })).toBe(true)
    expect(isCurrentInstagramCache({ id: "instagram", items }, indexedAt + 7 * 86400000)).toBe(false)
    expect(isCurrentInstagramCache({ id: "instagram", items: [{ id: "blog", title: "Meta update", url: "https://about.fb.com/news/" }] })).toBe(false)
    expect(isCurrentInstagramCache({ id: "cnn", items: [] })).toBe(true)
  })
})
