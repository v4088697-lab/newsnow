import { useToast } from "./useToast"

export function usePWA() {
  const toaster = useToast()

  useEffect(() => {
    const update = () => {
      applyPwaUpdate().catch((error) => {
        console.warn("service worker update failed", error)
      })
    }
    return subscribePwaUpdateState((state) => {
      if (state === "ready") {
        toaster("网站有新版本，5 秒后自动更新", {
          action: {
            label: "立刻更新",
            onClick: update,
          },
        })
      } else if (state === "successful") {
        toaster("网站已更新为最新版本", { type: "success" })
      }
    })
  }, [toaster])
}
