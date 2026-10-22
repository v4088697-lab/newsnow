// Vite supplies this virtual module in production; lifecycle tests replace it with a mock.
export function registerSW(): (reload?: boolean) => Promise<void> {
  throw new Error("Mock service worker registration in browser lifecycle tests")
}
