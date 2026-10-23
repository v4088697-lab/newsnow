import { useLocale } from "~/i18n"

export function Footer() {
  const { t } = useLocale()
  return (
    <>
      <a href={`${Homepage}/blob/main/LICENSE`} target="_blank">{t("MIT LICENSE")}</a>
      <span>
        <span>
          NewsNow © 2024
          {t("By")}
        </span>
        <a href={Author.url} target="_blank">
          {Author.name}
        </a>
      </span>
    </>
  )
}
