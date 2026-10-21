import { useEffect, useState } from "react"

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function useInstallApp() {
  const [prompt, setPrompt] = useState<InstallPromptEvent>()
  const [installed, setInstalled] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)")
    const updateInstalled = () => {
      setInstalled(standalone.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)
    }
    const beforeInstall = (event: Event) => {
      event.preventDefault()
      setPrompt(event as InstallPromptEvent)
    }
    const onInstalled = () => {
      setPrompt(undefined)
      setInstalled(true)
    }
    updateInstalled()
    window.addEventListener("beforeinstallprompt", beforeInstall)
    window.addEventListener("appinstalled", onInstalled)
    standalone.addEventListener("change", updateInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
      standalone.removeEventListener("change", updateInstalled)
    }
  }, [])

  const install = async () => {
    if (!prompt || installing) return
    setInstalling(true)
    // Each browser prompt can only be used once, even after dismissal.
    setPrompt(undefined)
    try {
      await prompt.prompt()
      return (await prompt.userChoice).outcome
    } finally {
      setInstalling(false)
    }
  }

  return { installed, installing, canInstall: !!prompt, install }
}
