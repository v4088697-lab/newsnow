import { execFileSync } from "node:child_process"
import * as fs from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

const projectRequire = createRequire(join(process.cwd(), "package.json"))
const eslintRequire = createRequire(projectRequire.resolve("eslint"))
const workboxRequire = createRequire(projectRequire.resolve("workbox-build"))
const nitroRequire = createRequire(projectRequire.resolve("nitropack/package.json"))
const listhenRequire = createRequire(nitroRequire.resolve("listhen"))
const minimatch = eslintRequire("minimatch")
const glob = workboxRequire("glob")
const forge = listhenRequire("node-forge")

describe("patched security dependencies used by existing build tools", () => {
  let fixture: string

  beforeAll(() => {
    fixture = fs.mkdtempSync(join(tmpdir(), "newsnow-glob-"))
    fs.mkdirSync(join(fixture, "nested"))
    fs.writeFileSync(join(fixture, "a.ts"), "")
    fs.writeFileSync(join(fixture, "b.js"), "")
    fs.writeFileSync(join(fixture, "nested", "c.ts"), "")
  })

  afterAll(() => {
    fs.unlinkSync(join(fixture, "nested", "c.ts"))
    fs.unlinkSync(join(fixture, "a.ts"))
    fs.unlinkSync(join(fixture, "b.js"))
    fs.rmdirSync(join(fixture, "nested"))
    fs.rmdirSync(fixture)
  })

  it("keeps legacy callable minimatch and modern named exports compatible", () => {
    expect(minimatch("src/page.tsx", "src/*.{ts,tsx}")).toBe(true)
    expect(minimatch.filter("**/*.ts")("src/page.ts")).toBe(true)
    expect(minimatch.defaults({ nocase: true })("PAGE.TS", "*.ts")).toBe(true)
    expect(minimatch.minimatch("src/page.js", "**/*.ts")).toBe(false)
    expect(new minimatch.Minimatch("**/!(*.test).ts").match("src/page.ts")).toBe(true)
  })

  it("bounds amplified glob-pattern preprocessing in a separate process", () => {
    const output = execFileSync(process.execPath, [
      "--max-old-space-size=128",
      "-e",
      "const {Minimatch}=require(process.argv[1]); new Minimatch('a/'+'**/../'.repeat(24)+'z',{optimizationLevel:2}); process.stdout.write('bounded')",
      eslintRequire.resolve("minimatch"),
    ], { timeout: 4000, encoding: "utf8" })
    expect(output).toBe("bounded")
  })

  it("keeps sync and async glob APIs, brace expansion and ignores working", async () => {
    expect(glob.globSync("**/*.{ts,js}", { cwd: fixture, nodir: true }).sort()).toEqual(["a.ts", "b.js", join("nested", "c.ts")])
    expect(await glob.glob("**/*.ts", { cwd: fixture, nodir: true, ignore: ["nested/**"] })).toEqual(["a.ts"])
  })

  it("rejects an aborted traversal without reading directories", async () => {
    const readdir = vi.fn(fs.readdir)
    const readdirAsync = vi.fn(fs.promises.readdir)
    const reason = new Error("Traversal cancelled")
    await expect(glob.glob("**/*", {
      cwd: fixture,
      signal: AbortSignal.abort(reason),
      fs: { ...fs, readdir, promises: { ...fs.promises, readdir: readdirAsync } },
    })).rejects.toBe(reason)
    await new Promise<void>(resolve => setImmediate(resolve))
    expect(readdir).not.toHaveBeenCalled()
    expect(readdirAsync).not.toHaveBeenCalled()
  })

  it("bounds malformed PEM decoding in a separate process", () => {
    const output = execFileSync(process.execPath, [
      "--max-old-space-size=128",
      "-e",
      "const f=require(process.argv[1]); try{f.pem.decode('-----BEGIN '+'A'.repeat(50000))}catch{} process.stdout.write('bounded')",
      listhenRequire.resolve("node-forge"),
    ], { timeout: 4000, encoding: "utf8" })
    expect(output).toBe("bounded")
  })

  it("keeps certificate tooling RSA signing and PEM round trips working", () => {
    const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 })
    const digest = forge.md.sha256.create().update("NewsNow security check")
    const signature = keys.privateKey.sign(digest)
    expect(keys.publicKey.verify(digest.digest().bytes(), signature)).toBe(true)
    expect(forge.pki.publicKeyFromPem(forge.pki.publicKeyToPem(keys.publicKey)).n.equals(keys.publicKey.n)).toBe(true)
  })
})
