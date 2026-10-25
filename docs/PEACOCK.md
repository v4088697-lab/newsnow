# Peacock seven-day program recommendations

The primary source is the public [Showlabs Peacock US weekly chart](https://www.showlabs.tv/en/peacock-top-10/united-states).
The feed keeps up to ten TV-series entries in the provider's original rank
order. Each entry includes the original rank and the complete seven-day date
range. Films are excluded. Separate program editions retain separate source
links and ranks, even when their upstream display names are identical.

This is the latest published weekly chart, not a rolling last-seven-days
measurement or an official Peacock chart. Publication is delayed. The source's
viewing counts are not public and are not extracted or invented. Recommendation
links open the source chart provider's program detail pages; the card header
continues to link to Peacock.

The parser checks the country/platform heading, seven-day period, nonfuture
dates, public TVSeries metadata, valid ranks and allowed source URLs. Periods
whose end boundary is more than fourteen days behind the current UTC day are not
accepted. Monthly charts, films, external links, invalid dates and duplicate
IDs are excluded. No new package dependency is required.

When the chart is unavailable or stale, the feed returns explicitly labeled
official Peacock blog updates. Single-source and bulk cache paths invalidate
legacy blog cards and stale weekly periods. The client preserves provider
ranks instead of calculating misleading position changes between refreshes.

Actual source and production API checks returned ten programs for October
12–18, 2026, with the direct source request taking approximately 1.2 seconds.
250 regression tests cover the parser, dates, fallback labels, cache migration,
existing sources and all twelve language dictionaries. Production build,
type checking, lint and SEO verification are also required before rollout.

Redeploy the latest GitHub `main` in Hostinger to apply the change publicly.
