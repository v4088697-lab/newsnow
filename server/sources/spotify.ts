import { myFetch } from "../utils/fetch"
import { parseSpotifyRisers } from "../utils/spotify-risers"

export default async () => parseSpotifyRisers(await myFetch("https://charts-spotify-com-service.spotify.com/public/v0/charts", { retry: 0, timeout: 8000 }))
