import type { NewsItem } from "@shared/types"

function parseTsv(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let value = ""
  let quoted = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === "\"") {
      if (quoted && text[index + 1] === "\"") {
        value += "\""
        index++
      } else {
        quoted = !quoted
      }
    } else if (!quoted && (char === "\t" || char === "\n")) {
      row.push(value.replace(/\r$/, ""))
      value = ""
      if (char === "\n") {
        rows.push(row)
        row = []
      }
    } else {
      value += char
    }
  }
  if (value || row.length) {
    row.push(value.replace(/\r$/, ""))
    rows.push(row)
  }
  return rows
}

export function parseNetflixChart(tsv: string): NewsItem[] {
  const [headers, ...rows] = parseTsv(tsv)
  if (!headers) throw new Error("Netflix chart unavailable")
  const index = (name: string) => headers.indexOf(name)
  if (["week", "category", "weekly_rank", "show_title", "season_title"].some(name => index(name) < 0)) throw new Error("Invalid Netflix chart columns")
  const weeks = new Map<string, Map<number, string[]>>()
  for (const row of rows) {
    const week = row[index("week")]
    const rank = Number(row[index("weekly_rank")])
    if (row[index("category")] !== "TV (English)" || !/^\d{4}-\d{2}-\d{2}$/.test(week ?? "")
      || !Number.isInteger(rank) || rank < 1 || rank > 10 || !row[index("show_title")]?.trim()) {
      continue
    }
    if (!weeks.has(week)) weeks.set(week, new Map())
    weeks.get(week)!.set(rank, row)
  }
  const latest = [...weeks.keys()].sort().reverse().find(week => weeks.get(week)!.size === 10)
  if (!latest) throw new Error("No complete Netflix Top 10 week")
  return [...weeks.get(latest)!].sort(([a], [b]) => a - b).map(([rank, row]) => {
    const show = row[index("show_title")]
    const season = row[index("season_title")]
    const title = season && season !== "N/A" ? season : show
    const views = Number(row[index("weekly_views")])
    return {
      id: `netflix:${latest}:${rank}`,
      title,
      url: `https://www.netflix.com/search?q=${encodeURIComponent(show)}`,
      extra: {
        info: `全球英语剧集周榜 · ${latest}${Number.isFinite(views) && views > 0 ? ` · ${views.toLocaleString("en-US")} 次观看` : ""}`,
        hover: `Netflix 官方周榜，第 ${rank} 名；点击在 Netflix 搜索片名。`,
      },
    }
  })
}
