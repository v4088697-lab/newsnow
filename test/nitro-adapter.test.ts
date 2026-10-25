import { createServer } from "node:http"
import type { IncomingMessage, ServerResponse } from "node:http"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import viteNitro from "vite-plugin-with-nitro"

const nitro = vi.hoisted(() => ({
  createNitro: vi.fn(),
  createDevServer: vi.fn(),
  build: vi.fn(),
  close: vi.fn(),
}))

vi.mock("nitropack", () => ({
  ...nitro,
  prepare: vi.fn(),
  copyPublicAssets: vi.fn(),
  prerender: vi.fn(),
}))

type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => unknown

describe("official Nitro development adapter", () => {
  let middleware: Middleware
  let server: ReturnType<typeof createServer>
  let origin: string

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv("NITRO_HOST", "localhost")
    vi.stubEnv("NITRO_PORT", "0")
    nitro.createNitro.mockResolvedValue({ close: nitro.close })
    nitro.createDevServer.mockReturnValue({
      app: {
        handler: (event: { node: { req: IncomingMessage, res: ServerResponse } }) => {
          event.node.res.end(`nitro:${event.node.req.url}`)
        },
      },
    })
    server = createServer((req, res) => {
      middleware(req, res, () => res.end("vite"))
    })
    const plugin = viteNitro()
    if (typeof plugin.config !== "function" || typeof plugin.configureServer !== "function") throw new Error("Missing adapter hooks")
    await Reflect.apply(plugin.config, {}, [{}, { command: "serve" }])
    await Reflect.apply(plugin.configureServer, {}, [{
      middlewares: { use: (handler: Middleware) => {
        middleware = handler
      } },
      httpServer: server,
      config: { server: { host: "127.0.0.1", port: 0 } },
    }])
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Missing test listener")
    origin = `http://127.0.0.1:${address.port}`
  })

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    expect(nitro.close).toHaveBeenCalledOnce()
    vi.unstubAllEnvs()
  })

  it.each(["/api", "/api/s?id=cnn&latest=true"])("preserves the complete API URL without a proxy loop: %s", async (path) => {
    const response = await fetch(`${origin}${path}`)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe(`nitro:${path}`)
    expect(nitro.createNitro.mock.calls[0][0].routeRules?.["/**"]?.proxy).toBeUndefined()
  })

  it.each(["/apiary", "/assets/app.js"])("keeps non-API requests in Vite: %s", async (path) => {
    const response = await fetch(`${origin}${path}`)
    expect(await response.text()).toBe("vite")
  })
})
