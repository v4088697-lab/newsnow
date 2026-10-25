# Dependency security updates — 2026-10-24

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

One high-severity advisory remains visible in the full audit. It is not
suppressed or treated as fixed:

| Dependency path under vite-plugin-with-nitro → nitropack | Advisory | Status |
| --- | --- | --- |
| listhen → node-forge 1.4.0 | [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | No patched upstream release listed at verification time. |

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
