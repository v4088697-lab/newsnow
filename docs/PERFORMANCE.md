# Loading performance and recommendation updates

## Local production measurements

Lighthouse was run against `/c/updated` on the production Node build, using
Chrome headless and Lighthouse's default simulated mobile throttling, with a
fresh browser profile. These are individual local laboratory runs, not a
measurement of the deployed `feedvoyage.com` website or a guaranteed score.

| Metric | Before | Final build |
| --- | ---: | ---: |
| Performance score | 83 | 92 |
| First Contentful Paint | 1.92 s | 1.77 s |
| Largest Contentful Paint | 4.14 s | 3.00 s |
| Total Blocking Time | 158 ms | 128 ms |
| Main-thread work | 2,009 ms | 1,323 ms |
| JavaScript execution | 1,001 ms | 488 ms |
| Cumulative Layout Shift | 0.00060 | 0.00047 |
| Initial JavaScript, uncompressed | 702,204 bytes | 479,831 bytes |

The final entry transfers 139,252 bytes with Brotli. The raw entry is about
32% smaller. Machine load, data-cache state, upstream sources and deployed
network conditions can change subsequent results. The user's screenshot used
a different environment and cannot be directly compared to these local runs.

## Changes

- Load the selected language dictionary on demand; keep English as the
  default and retain saved selection, cross-tab updates and Arabic RTL.
- Load drag-and-drop code only for the Followed page.
- Mount full cards, query subscriptions and custom scrollbars near the
  viewport. Lightweight source headings remain present; keyboard focus
  activates a card and retains focus. Browsers without IntersectionObserver
  activate all cards.
- Let supporting browsers skip offscreen layout with `content-visibility`.
  Unsupported CSS is ignored, preserving the ordinary layout.
- Reuse Intl formatters and share the relative-time timer and visibility
  listener instead of creating them separately for every timestamp.

The card grid, header actions, source links, language selector, refresh,
following and SEO directory remain available. SEO checks verify server HTML
for every public column and missing-page behavior.

## Recommendation provenance

**Rumble** now discovers recent video links instead of using company releases
as the main feed. Videos with verified upload dates within seven days and
public views rank first. Otherwise, resolved public video links discovered
through Google News within seven days are explicitly marked as indexed picks.
Index dates do not establish upload dates. Results are sampled, capped at ten,
and are not a sitewide ranking or seven-day view growth. An actual cold API
check returned six recent indexed video links in approximately 4.2 seconds.
Company-update fallback remains clearly labeled.

**Paramount+** uses the official press program catalog and matches English
Wikipedia articles identified as television series. Ambiguous matches,
upcoming series and unavailable data are omitted. Wikimedia's public daily
human page views are compared over the latest complete seven UTC days and
the preceding seven, using identical dates for all candidates. At most a
two-day publication lag is accepted. Complete 14-day measurements and a
positive baseline are required. Positive percentage growth determines order;
the feed includes up to ten programs and displays counts and dates. This is
sampled public attention, not Paramount+ streams, availability by territory or
a platform-wide viewing chart. Low baselines can yield large percentages.
Unavailable comparisons fall back to explicitly labeled official news.

Requests use bounded concurrency and a ten-second comparison budget. The
source cache avoids repeating the lookup on each page view. Single-source and
bulk cache paths invalidate legacy recommendations and expired comparisons.
An actual production API check returned ten program comparisons in about
9.1 seconds cold, then served the cached result.

Sources: [Paramount+ official catalog](https://www.paramountpressexpress.com/paramount-plus/shows/),
[Wikimedia page-view API](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/page-views.html).

## Validation and rollout

240 regression tests, type checking, lint, production build and SEO checks
passed. Browser checks covered recent recommendation text, deferred card
activation by keyboard, preserved focus, following/unfollowing, the lazy
sortable grid and Arabic RTL, then restored the original language/follows.

Redeploy the latest GitHub `main` in Hostinger. Keep the existing Node server
entry (`dist/output/server/index.mjs`) and public directory
(`dist/output/public`). Once that deployment completes, repeat PageSpeed on
the public URL for mobile and desktop. Local measurements do not confirm
that a Hostinger deployment has taken place.
