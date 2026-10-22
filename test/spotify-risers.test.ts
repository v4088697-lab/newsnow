import { describe, expect, it, vi } from "vitest"
import { parseSpotifyRisers } from "../server/utils/spotify-risers"
import spotify from "../server/sources/spotify"
import { myFetch } from "../server/utils/fetch"
import { genSources } from "../shared/pre-sources"

vi.mock("../server/utils/fetch", () => ({ myFetch: vi.fn() }))
function track(id: number, rank: number, previous: number, status = "MOVED_UP") {
  return {
    chartEntryData: { currentRank: rank, previousRank: previous, entryStatus: status },
    trackMetadata: { trackUri: `spotify:track:${String(id).padStart(22, "a")}`, trackName: `Song ${id}`, artists: [{ name: "Artist &amp; Guest" }] },
  }
}
const chart = (entries: unknown[], date = "2026-10-15", alias = "REGIONAL_GLOBAL_WEEKLY") => ({ displayChart: { date, chartMetadata: { alias, entityType: "TRACK" } }, entries })
const response = (entries: unknown[]) => ({ chartEntryViewResponses: [chart(entries)] })

describe("spotify weekly rank risers", () => {
  it("registers the music category and discloses the public top 50 scope", () => {
    expect(genSources().spotify).toMatchObject({ name: "Spotify", column: "music", title: "7天上升最快" })
    expect(genSources().spotify.desc).toContain("前50")
  })

  it("sorts by real weekly rank gain, not current popularity", () => {
    const items = parseSpotifyRisers(response([track(1, 1, 2), track(2, 47, 65), track(3, 22, 39)]))
    expect(items.map(item => item.title.split(" — ")[0])).toEqual(["Song 2", "Song 3", "Song 1"])
    expect(items[0].extra?.info).toBe("↑18 位 · 65→47 · 全球公开前50 · 2026-10-09～2026-10-15")
    expect(items[0].title).toContain("Artist & Guest")
    expect(items[0].url).toMatch(/^https:\/\/open\.spotify\.com\/track\/[a-z0-9]{22}$/)
  })

  it("breaks equal-gain ties by current chart position", () => {
    expect(parseSpotifyRisers(response([track(1, 20, 30), track(2, 5, 15)]))[0].title).toContain("Song 2")
  })

  it("excludes new entries, reentries, declines, ties and songs outside the public top 50", () => {
    const items = parseSpotifyRisers(response([track(1, 10, 20), track(2, 1, 0, "NEW_ENTRY"), track(3, 3, 30, "RE_ENTRY"), track(4, 8, 5, "MOVED_DOWN"), track(5, 9, 9, "NO_CHANGE"), track(6, 51, 190)]))
    expect(items).toHaveLength(1)
    expect(items[0].title).toContain("Song 1")
  })

  it("selects the newest global weekly song chart and ignores daily or other entity charts", () => {
    const data = { chartEntryViewResponses: [chart([track(1, 1, 10)], "2026-10-08"), chart([track(2, 2, 50)], "2026-10-15", "REGIONAL_US_WEEKLY"), chart([track(3, 3, 100)], "2026-10-15", "REGIONAL_GLOBAL_DAILY"), chart([track(4, 4, 20)])] }
    expect(parseSpotifyRisers(data)[0].title).toContain("Song 4")
  })

  it("deduplicates track IDs and returns at most ten comparable tracks", () => {
    const tracks = Array.from({ length: 15 }, (_, i) => track(i, i + 1, i + 20))
    expect(parseSpotifyRisers(response([...tracks, ...tracks]))).toHaveLength(10)
  })

  it("rejects invalid ranks, track identifiers, metadata and dates instead of inventing risers", () => {
    const invalid = track(1, 3, 30)
    invalid.trackMetadata.trackUri = "spotify:album:invalid"
    expect(() => parseSpotifyRisers(response([invalid, track(2, 1.5, 10), track(3, -1, 10)]))).toThrow()
    expect(() => parseSpotifyRisers({ chartEntryViewResponses: [chart([track(1, 1, 2)], "2026-02-30")] })).toThrow()
    expect(() => parseSpotifyRisers(response([track(1, 1, 1)]))).toThrow()
  })

  it("propagates upstream outages so the normal cache can be retained", async () => {
    vi.mocked(myFetch).mockRejectedValueOnce(new Error("Spotify unavailable"))
    await expect(spotify()).rejects.toThrow("Spotify unavailable")
    expect(myFetch).toHaveBeenCalledTimes(1)
  })
})
