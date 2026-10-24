# Dependency security update — 2026-10-24

The six scanner findings in the Hostinger screenshot are addressed in
`package.json` and `pnpm-lock.yaml`. Deploy both files together.

| Package | Previously installed | Locked after this update | Advisory |
| --- | --- | --- | --- |
| undici | 7.29.0 | 7.30.1 | [CVE-2026-109869](https://github.com/advisories/GHSA-xjj6-f33q-929c) |
| toml | 4.3.0 | 5.0.1 | [CVE-2026-114141](https://github.com/BinaryMuse/toml-node/security/advisories/GHSA-4qx8-w7c3-pj3p), [CVE-2026-114143](https://github.com/BinaryMuse/toml-node/security/advisories/GHSA-9j65-hcg3-gc64), [CVE-2026-114144](https://github.com/BinaryMuse/toml-node/security/advisories/GHSA-9qmh-m7c6-f92p) |
| launch-editor | 2.14.1 | 2.14.2 | [CVE-2026-112942](https://github.com/advisories/GHSA-587h-7wmj-h5pm) |
| vite | 7.3.6 | 7.3.7 | [CVE-2026-112942](https://github.com/advisories/GHSA-587h-7wmj-h5pm) |

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

At verification time the full audit decreased from **43 to 4 advisories**;
the production dependency audit reported **0 advisories**. The 220 existing
tests, type checks, lint and Node server production build passed. The running
build also passed `pnpm check:seo`, and the CNN API returned HTTP 200 with
30 items. Audits are a dated dependency check, not a guarantee against all
application or future vulnerabilities.

## Remaining build dependency advisories

These four high-severity advisories remain visible in the full audit. They
are not suppressed or treated as fixed:

| Dependency path under vite-plugin-with-nitro → nitro-go | Advisory | Status |
| --- | --- | --- |
| @netlify/functions → extract-zip 2.0.1 | [GHSA-jmr9-qjv8-65gv](https://github.com/advisories/GHSA-jmr9-qjv8-65gv), [GHSA-7pqw-9j4j-h8q3](https://github.com/advisories/GHSA-7pqw-9j4j-h8q3) | No patched upstream release listed at verification time. |
| listhen → node-forge 1.4.0 | [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | No patched upstream release listed at verification time. |
| @netlify/functions → @netlify/zip-it-and-ship-it → zod 3.24.4 | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) | Requires migration of the legacy Netlify build adapter to Zod 4 compatible tooling. Forcing a global Zod 4 override would break Zod 3 APIs used by that adapter. |

The generated `dist/output/server/package.json` and its external runtime
modules do not contain extract-zip, node-forge or zod. Their absence from the
Node runtime does not remove the risks of installing or using the affected
build/development tools. Do not process untrusted ZIP archives or Netlify
configuration with these legacy tools. Resolving the remaining findings
requires an upstream fix or a separately validated build adapter migration.

## Hostinger deployment

Redeploy the updated GitHub `main` branch using the existing Node application
configuration: build `pnpm run build`, public output `dist/output/public`,
entry file `dist/output/server/index.mjs`. If offered, clear the old build
cache when redeploying, then run Hostinger's security scan again.

Local verification does not confirm that Hostinger has deployed this commit.
The screenshot's findings are only resolved on the live server after the new
dependencies have been installed and that deployment has completed.
