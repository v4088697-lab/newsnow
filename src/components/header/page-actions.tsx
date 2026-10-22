import { useEffect, useRef, useState } from "react"
import { getInstallInstructions, sharePage } from "@shared/page-actions"
import { useInstallApp } from "~/hooks/useInstallApp"
import { useToast } from "~/hooks/useToast"

export function PageActions() {
  const toaster = useToast()
  const { installed, installing, canInstall, install } = useInstallApp()
  const [sharing, setSharing] = useState(false)
  const [help, setHelp] = useState<{ title: string, text: string, url?: string }>()
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (help) dialog.current?.showModal()
  }, [help])

  const share = async () => {
    if (sharing) return
    setSharing(true)
    try {
      const url = window.location.href
      const result = await sharePage({ title: document.title, url }, navigator)
      if (result === "copied") toaster("Page link copied", { type: "success" })
      if (result === "manual") {
        setHelp({ title: "Share this page", text: "Select and copy the link below to share it.", url })
      }
    } finally {
      setSharing(false)
    }
  }

  const showInstallHelp = () => setHelp({
    title: "Install NewsNow",
    text: getInstallInstructions(navigator.userAgent, navigator.maxTouchPoints),
  })

  const installApp = async () => {
    if (canInstall) {
      try {
        await install()
      } catch {
        showInstallHelp()
      }
    } else {
      showInstallHelp()
    }
  }

  return (
    <>
      <button
        type="button"
        title="Share this page"
        aria-label="Share this page"
        className="btn flex items-center justify-center min-h-7 min-w-6"
        disabled={sharing}
        onClick={share}
      >
        <span className="i-ph:share-network-duotone" aria-hidden="true" />
      </button>
      <button
        type="button"
        title={installed ? "App installed" : "Install as app"}
        aria-label={installed ? "App installed" : "Install as app"}
        className="btn flex items-center justify-center min-h-7 min-w-6"
        disabled={installed || installing}
        onClick={installApp}
      >
        <span className={installed ? "i-ph:check-circle-duotone" : "i-ph:download-simple-duotone"} aria-hidden="true" />
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="page-actions-title"
        aria-describedby="page-actions-description"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl bg-base color-base p-5 shadow-xl backdrop:bg-black/40 text-base"
        onClose={() => setHelp(undefined)}
      >
        <h2 id="page-actions-title" className="text-lg font-bold mb-3">{help?.title}</h2>
        <p id="page-actions-description" className="leading-relaxed">{help?.text}</p>
        {help?.url && (
          <input
            aria-label="Current page link"
            readOnly
            value={help.url}
            onFocus={event => event.currentTarget.select()}
            style={{ userSelect: "text", cursor: "text" }}
            className="mt-3 w-full min-w-0 rounded border border-neutral-400/40 bg-transparent p-2 text-sm"
          />
        )}
        <form method="dialog" className="mt-4 flex justify-end">
          <button type="submit" className="btn rounded px-3 py-1 bg-primary/10">Close</button>
        </form>
      </dialog>
    </>
  )
}
