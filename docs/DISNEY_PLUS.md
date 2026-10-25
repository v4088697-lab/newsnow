# Disney+ seven-day program recommendations

The primary source is the public [Showlabs Disney+ US weekly chart](https://www.showlabs.tv/en/disney-top-10/united-states).
The feed selects TV-series entries from the latest published complete
seven-day chart, preserving original ranks and displaying the date range.
Films are excluded rather than replaced with unrelated entries. Up to ten
programs can be returned; the actual October 12–18, 2026 chart yields nine
programs because rank eight is a film.

This is a delayed published weekly chart, not a rolling last-seven-day
measurement or an official Disney+ ranking. The source's viewing counts are
not public and are not inferred. Program links open Showlabs detail pages;
the source header continues to open Disney+.

Disney+ and Peacock share the validated weekly parser. Platform-specific
wrappers check the correct platform heading and ItemList name and retain
separate cache metadata. The parser rejects nonweekly, future, invalid and
stale periods, external URLs and invalid ranks. Single-source and bulk API
paths invalidate legacy press-release cards and expired weekly periods.
Client refreshes preserve provider ranks instead of generating misleading
position changes. Only these weekly cards use separate lines for program
names, attribution and dates to remain readable on mobile.

When the weekly chart is unavailable or stale, Disney+ official press news
is clearly labeled as official updates. Official news aggregation is used
only if the direct press source is unavailable too. English remains the
default, with all twelve existing interface languages supported.

The direct source check returned nine programs in approximately 0.9 seconds.
260 regression tests and type checking passed, including Peacock compatibility,
cross-platform isolation, date validation, fallback labels and cache migration.
Production build, lint, SEO and browser checks are completed before rollout.

Redeploy the latest GitHub `main` in Hostinger to apply the update publicly.
