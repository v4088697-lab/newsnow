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
        toaster("A new version is available. Updating in 5 seconds.", {
          action: {
            label: "Update now",
            onClick: update,
          },
        })
      } else if (state === "successful") {
        toaster("The website is up to date.", { type: "success" })
      }
    })
  }, [toaster])
}
