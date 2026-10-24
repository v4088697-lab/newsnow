interface PageShareData {
  title: string
  url: string
}

interface ShareBrowser {
  share?: (data: PageShareData) => Promise<void>
  clipboard?: { writeText: (text: string) => Promise<void> }
}

export async function sharePage(data: PageShareData, browser: ShareBrowser): Promise<"shared" | "cancelled" | "copied" | "manual"> {
  if (browser.share) {
    try {
      await browser.share(data)
      return "shared"
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return "cancelled"
    }
  }

  try {
    if (!browser.clipboard) return "manual"
    await browser.clipboard.writeText(data.url)
    return "copied"
  } catch {
    return "manual"
  }
}

export function getInstallInstructions(userAgent: string, maxTouchPoints: number) {
  if (/iPad|iPhone|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)) {
    return "Open this page in Safari, tap Share, choose “Add to Home Screen”, then tap “Add”."
  }
  if (/Android/i.test(userAgent)) {
    return "Open the browser menu and choose “Install app” or “Add to Home Screen”. If unavailable, open this page in the latest version of Chrome."
  }
  if (/Macintosh|Mac OS X/i.test(userAgent)) {
    return "In Safari on Mac, open File and choose “Add to Dock” (macOS Sonoma or later). In Chrome or Edge, use the install option in the browser menu."
  }
  return "Open this page in Chrome or Edge. Click the install icon in the address bar, or choose “Install NewsNow” / “Install this site as an app” from the browser menu. If unavailable, check that you are using HTTPS and try again later."
}
