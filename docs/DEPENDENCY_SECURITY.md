# Dependency security updates — latest check 2026-10-30

## 2026-10-30: five seroval advisories

The screenshot's five `seroval` findings are addressed by pinning the existing
pnpm override to **1.6.11** and regenerating the lockfile. TanStack Router and
`seroval-plugins` now resolve a single `seroval@1.6.11` instead of 1.6.7.
No other resolved package version, earlier security fix or application feature
is changed by this update.

| Advisory | Earliest patched version |
| --- | --- |
| [CVE-2026-116580](https://github.com/lxsmnsyc/seroval/security/advisories/GHSA-7rv5-mrxv-xcr9) — async-iterator source validation | 1.6.8 |
| [CVE-2026-116581](https://github.com/lxsmnsyc/seroval/security/advisories/GHSA-97r2-qh9m-474h) — array and sequence metadata denial of service | 1.6.8 |
| [CVE-2026-116584](https://github.com/lxsmnsyc/seroval/security/advisories/GHSA-wp97-x4hv-qvhp) — invalid array element-list length | 1.6.8 |
| [CVE-2026-116582](https://github.com/lxsmnsyc/seroval/security/advisories/GHSA-9wx9-5pv9-3349) — RegExp HTML script injection on the 1.x line | 1.6.10 |
| [CVE-2026-116583](https://github.com/lxsmnsyc/seroval/security/advisories/GHSA-f86p-h4j2-7qgj) — typed-array constructor code injection | 1.6.11 |

Validation: frozen-lockfile installation, type checks, lint, all **260 tests**,
production build and SEO/runtime page checks passed. The running news API
returned HTTP 200 with 30 CNN items. Focused checks confirmed that `fromJSON`
and `fromCrossJSON` reject non-array element lists; JavaScript-output APIs
ignore an untrusted typed-array constructor name; RegExp sources containing
`<` are escaped; ordinary structured-data round trips still work.

The production-dependency audit reports **0 advisories**. The complete audit
still reports the two build-tool findings listed below (`node-forge` and
`deepmerge`), with no patched upstream versions listed. The five screenshot
findings are absent from the audit and 1.6.7 is absent from the lockfile.
Hostinger must install this lockfile in a fresh deployment and rescan it before
the live application can be considered updated.

## 2026-10-28: qs CVE-2026-110816

The 2026-10-28 screenshot's `qs` finding is fixed by pinning the existing pnpm
override to **6.16.1** and regenerating the lockfile. The only resolved package
changed in this update is `qs` (6.16.0 → 6.16.1); earlier security overrides,
adapter patches and application code remain unchanged.

The [upstream advisory](https://github.com/ljharb/qs/security/advisories/GHSA-6pq8-jhm2-2vcw)
identifies an uncaught exception in comma-array serialization when an element
has a non-callable own `toString`. Versions 6.7.0 through 6.16.0 are affected;
6.16.1 is the patched release. The dependency path is
`nitropack → unstorage → @netlify/blobs → @netlify/dev-utils → netlify → qs`.

Validation for this update: frozen-lockfile installation, type checks, lint,
all **260 tests**, production build and SEO/runtime page checks passed. The
advisory input no longer throws with either value of `encodeValuesOnly`, and
ordinary comma-array serialization and parsing were also checked.

The project production-dependency audit reports **0 advisories**. The complete
audit reports **2** remaining build-tool findings, listed below; neither is
suppressed. These are dated audit results, not a claim that all possible
vulnerabilities are absent. Redeploy Hostinger and scan the new deployment.

## Earlier remediation — 2026-10-24

The six scanner findings in the Hostinger screenshot are addressed in
`package.json` and `pnpm-lock.yaml`. Deploy both files together.

| Package | Previously installed | Locked after this update | Advisory |
| --- | --- | --- | --- |
| undici | 7.29.0 | 7.30.1 | [CVE-2026-109869](https://github.com/advisories/GHSA-xjj6-f33q-929c) |
| toml | 4.3.0 | 5.0.1 | [CVE-2026-114141](https://github.com/BinaryMuse/toml-node/security/advisories/GHSA-4qx8-w7c3-pj3p), [CVE-2026-114143](https://github.com/BinaryMuse/toml-node/security/advisories/GHSA-9j65-hcg3-gc64), [CVE-2026-114144](https://github.com/BinaryMuse/toml-node/security/advisories/GHSA-9qmh-m7c6-f92p) |
| launch-editor | 2.14.1 | 2.14.2 | [CVE-2026-112942](https://github.com/advisories/GHSA-587h-7wmj-h5pm) |
| vite | 7.3.6 | 7.3.7 | [CVE-2026-112942](https://github.com/advisories/GHSA-587h-7wmj-h5pm) |

The follow-up screenshot's Zod 3 and esbuild findings are also addressed:

| Package | Previous dependency tree | Current dependency tree |
| --- | --- | --- |
| zod | 3.24.4 and 4.6.7 | 4.6.7 only |
| esbuild | 0.25.4 and 0.28.1 | 0.28.2 only |

The old `nitro-go` fork has been replaced with official `nitropack` 2.13.5.
This removes the legacy Netlify functions/ZIP toolchain that required Zod 3,
as well as both extract-zip advisories. The package manager now applies an
esbuild override to every dependency path, not only requests for 0.27.x.
The [esbuild advisory](https://github.com/advisories/GHSA-gv7w-rqvm-qjhr)
was withdrawn because the npm package was incorrectly identified, but the
old versions have still been removed to avoid stale scanner findings.

A committed pnpm patch for `vite-plugin-with-nitro` adapts development mode
to official Nitro: forward API requests with their original URL, let other
requests continue through Vite, remove the self-referential development
proxy rule, and close Nitro with Vite. Both ESM and CommonJS entries are
patched. Four HTTP regression cases cover the API root, API query strings,
non-API paths and server cleanup.

The full audit also identified advisories outside the screenshot. This update
raises the security floors for Vitest, busboy, fast-uri, postcss-selector-parser,
serialize-javascript, sharp, shell-quote, source-map-js and Zod 4. The TanStack
router, devtools and build plugin were updated together so the router tooling
uses Zod 4 without overriding its former Zod 3 API requirements.

TOML 5 rejects integers outside JavaScript's safe integer range by default.
See the [upstream changelog](https://github.com/BinaryMuse/toml-node/blob/v5.0.1/CHANGELOG.md)
before adding configuration containing such values.

## Validation

Use the declared package manager, **pnpm 10.30.3**, and Node.js 24. The global
pnpm 11 CLI ignores this project's `package.json` pnpm settings; do not use it
to regenerate the lockfile or bypass the existing security overrides.

```sh
pnpm install --frozen-lockfile
pnpm audit
pnpm audit --prod
pnpm typecheck
pnpm test --run
pnpm lint .
pnpm build
```

At verification time the full audit decreased from **4 to 1 advisory** in
this follow-up (43 before the first update);
the production dependency audit reported **0 advisories**. All 224
tests, type checks, lint and Node server production build passed. The running
build also passed `pnpm check:seo`, and the CNN API returned HTTP 200 with
30 items. The development server also returned HTTP 200 for its page and
CNN API after the adapter patch. Audits are a dated dependency check, not a guarantee against all
application or future vulnerabilities.

## Remaining build dependency advisories

At the 2026-10-30 check, one high-severity and one low-severity advisory remain
visible in the full audit. Neither is suppressed or treated as fixed:

| Build dependency path | Advisory | Status |
| --- | --- | --- |
| nitropack → listhen → node-forge 1.4.0 | [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | High severity; no patched upstream release listed in the audit. |
| workbox-build / nitropack → @rollup/plugin-node-resolve → deepmerge 4.3.1 | [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) | Low severity; no patched upstream release listed in the audit. |

The generated `dist/output/server/package.json` and its external runtime
modules do not contain node-forge or zod, and extract-zip is no longer in the
project lockfile. Node-forge's absence from the Node runtime does not resolve
the advisory in the development/build tools. Resolving this remaining finding
requires an upstream fix or replacement of the affected development tooling.

## Hostinger deployment

Redeploy the updated GitHub `main` branch using the existing Node application
configuration: build `pnpm run build`, public output `dist/output/public`,
entry file `dist/output/server/index.mjs`. If offered, clear the old build
cache when redeploying, then run Hostinger's security scan again.

Local verification does not confirm that Hostinger has deployed this commit.
The screenshot's findings are only resolved on the live server after the new
dependencies have been installed and that deployment has completed.
