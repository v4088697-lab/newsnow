import { load } from "cheerio"

export function googleNewsLinkTicket(html: string, url: string) {
  const article = /^https:\/\/news\.google\.com\/rss\/articles\/([\w-]+)(?:\?[^#]*)?$/.exec(url)
  if (!article) throw new Error("Invalid public discovery link")
  const element = load(html)("[data-n-a-id]").first()
  const id = element.attr("data-n-a-id")
  const timestamp = element.attr("data-n-a-ts")
  const signature = element.attr("data-n-a-sg")
  if (id !== article[1] || !timestamp || !/^\d{1,12}$/.test(timestamp) || !signature || !/^[\w-]{1,256}$/.test(signature)) throw new Error("Public discovery link unavailable")
  return { id, timestamp: Number(timestamp), signature }
}

export function googleNewsResolveBody(tickets: ReturnType<typeof googleNewsLinkTicket>[]) {
  const calls = tickets.map((ticket, index) => ["Fbv4je", JSON.stringify([
    "garturlreq",
    [["en-US", "US", ["FINANCE_TOP_INDICES", "WEB_TEST_1_0_0"], null, null, 1, 1, "US:en", null, 180, null, null, null, null, null, 0, null, null, [1608992183, 723341000]], "en-US", "US", 1, [2, 3, 4, 8], 1, 0, "655000234", 0, 0, null, 0],
    ticket.id,
    ticket.timestamp,
    ticket.signature,
  ]), null, String(index)])
  return new URLSearchParams({ "f.req": JSON.stringify([calls]) }).toString()
}

export function parseGoogleNewsResolvedLinks(response: string, canonicalize: (value: string) => string | undefined) {
  const links = new Map<number, string>()
  for (const line of response.split("\n")) {
    if (!line.startsWith("[")) continue
    try {
      const rows: unknown = JSON.parse(line)
      if (!Array.isArray(rows)) continue
      for (const row of rows) {
        if (!Array.isArray(row) || row[0] !== "wrb.fr" || row[1] !== "Fbv4je" || typeof row[2] !== "string"
          || typeof row[6] !== "string" || !/^\d+$/.test(row[6])) {
          continue
        }
        const result: unknown = JSON.parse(row[2])
        const url = Array.isArray(result) && result[0] === "garturlres" && typeof result[1] === "string" ? canonicalize(result[1]) : undefined
        if (url) links.set(Number(row[6]), url)
      }
    } catch {
      // Ignore unrelated or malformed frames without pairing a title to a wrong URL.
    }
  }
  return links
}
