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
    return "在 Safari 中打开此页面，点击分享按钮，选择「添加到主屏幕」，再点击「添加」。"
  }
  if (/Android/i.test(userAgent)) {
    return "打开浏览器菜单，选择「安装应用」或「添加到主屏幕」。如果没有此选项，请使用最新版 Chrome 打开此页面。"
  }
  return "在 Chrome 或 Edge 中打开此页面，点击地址栏右侧的安装图标，或在浏览器菜单中选择「安装 NewsNow」／「将此站点作为应用安装」。如果没有安装选项，请确认通过 HTTPS 访问并稍后重试。"
}
