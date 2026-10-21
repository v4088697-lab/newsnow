import { myFetch } from "../utils/fetch"
import { parseTwitchDirectory } from "../utils/platform-video"
import { twitchUpdates } from "../utils/platform-updates"

export default async () => {
  try {
    // This is the anonymous public client ID embedded in Twitch's directory,
    // not a user token. No account credentials or cookies are sent.
    const html = await myFetch<string, "text">("https://www.twitch.tv/directory", { responseType: "text", retry: 0, timeout: 3000 })
    const clientId = /clientId="([a-z0-9]+)"/.exec(html)?.[1]
    if (!clientId) throw new Error("Public Twitch directory client unavailable")
    const data = await myFetch("https://gql.twitch.tv/gql", {
      method: "POST",
      retry: 0,
      timeout: 4000,
      headers: { "Client-ID": clientId },
      body: { operationName: "PublicDirectory", query: "query PublicDirectory { games(first: 30) { edges { node { id name slug viewersCount } } } }" },
    })
    return parseTwitchDirectory(data)
  } catch {
    return twitchUpdates()
  }
}
