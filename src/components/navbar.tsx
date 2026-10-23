import { fixedColumnIds, metadata } from "@shared/metadata"
import { Link } from "@tanstack/react-router"
import { currentColumnIDAtom } from "~/atoms"
import { useLocale } from "~/i18n"

export function NavBar() {
  const { locale, t } = useLocale()
  const currentId = useAtomValue(currentColumnIDAtom)
  const { toggle } = useSearchBar()
  return (
    <span
      className={$([
        "flex p-3 rounded-2xl bg-primary/1 text-sm max-w-full overflow-x-auto whitespace-nowrap",
        "shadow shadow-primary/20 hover:shadow-primary/50 transition-shadow-500",
      ])}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <button
        type="button"
        onClick={() => toggle(true)}
        className={$(
          "px-2 hover:(bg-primary/10 rounded-md) op-70 dark:op-90",
          "cursor-pointer transition-all",
        )}
      >
        {t("More")}
      </button>
      {fixedColumnIds.map(columnId => (
        <Link
          key={columnId}
          to="/c/$column"
          params={{ column: columnId }}
          className={$(
            "px-2 hover:(bg-primary/10 rounded-md) cursor-pointer transition-all",
            currentId === columnId ? "color-primary font-bold" : "op-70 dark:op-90",
          )}
        >
          {t(metadata[columnId].name)}
        </Link>
      ))}
    </span>
  )
}
