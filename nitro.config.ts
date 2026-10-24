import process from "node:process"
import { join } from "node:path"
import { readFile } from "node:fs/promises"
import viteNitro from "vite-plugin-with-nitro"
import { RollopGlob } from "./tools/rollup-glob"
import { projectDir } from "./shared/dir"
import { renderSeoPage } from "./tools/seo-pages"
import { pageForPath } from "./shared/seo"

const nitroOption: Parameters<typeof viteNitro>[0] = {
  experimental: {
    database: true,
  },
  rollupConfig: {
    plugins: [RollopGlob()],
  },
  sourceMap: false,
  compressPublicAssets: true,
  hooks: {
    "rollup:before": (nitro) => {
      // Override the dependency's external renderer after its config merge.
      // Keeping this in our server directory lets Nitro bundle its imports.
      if (!nitro.options.dev) nitro.options.renderer = join(projectDir, "server/renderer.ts").replaceAll("\\", "/")
    },
  },
  virtual: {
    "#newsnow-pages": async () => {
      const output = join(projectDir, "dist")
      const paths = ["/", "/c/hottest", "/c/realtime", "/c/updated", "/c/focus", "/404"]
      const pages = Object.fromEntries(await Promise.all(paths.map(async (path) => {
        const file = path === "/" ? "index.html" : path === "/404" ? "404.html" : `${path.slice(1)}/index.html`
        const html = await readFile(join(output, file), "utf8").catch(async () => renderSeoPage(await readFile(join(projectDir, "index.html"), "utf8"), pageForPath(path)))
        return [path, html]
      })))
      return `export default ${JSON.stringify(pages)}`
    },
  },
  routeRules: {
    "/assets/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
  },
  database: {
    default: {
      connector: "better-sqlite3",
    },
  },
  devDatabase: {
    default: {
      connector: "better-sqlite3",
    },
  },
  imports: {
    dirs: ["server/utils", "shared"],
  },
  preset: "node-server",
  alias: {
    "@shared": join(projectDir, "shared"),
    "#": join(projectDir, "server"),
  },
}

if (process.env.VERCEL) {
  nitroOption.preset = "vercel-edge"
  // You can use other online database, do it yourself. For more info: https://db0.unjs.io/connectors
  nitroOption.database = undefined
  // nitroOption.vercel = {
  //   config: {
  //     cache: []
  //   },
  // }
} else if (process.env.CF_PAGES) {
  nitroOption.preset = "cloudflare-pages"
  nitroOption.unenv = {
    alias: {
      "safer-buffer": "node:buffer",
    },
  }
  nitroOption.database = {
    default: {
      connector: "cloudflare-d1",
      options: {
        bindingName: "NEWSNOW_DB",
      },
    },
  }
} else if (process.env.BUN) {
  nitroOption.preset = "bun"
  nitroOption.database = {
    default: {
      connector: "bun-sqlite",
    },
  }
}

export default function () {
  return viteNitro(nitroOption)
}
