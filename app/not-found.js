"use client";

import { useLang } from "@/components/LangProvider";
import { Empty, LinkButton } from "@/components/ui";

export default function NotFound() {
  const { t } = useLang();
  return (
    <div className="wrap page-pad">
      <Empty
        icon={<span className="mono">404</span>}
        title={t("notFound")}
        body={t("notFoundBody")}
        action={
          <>
            <LinkButton href="/">{t("backHome")}</LinkButton>
            <LinkButton href="/products" variant="secondary">{t("navProducts")}</LinkButton>
          </>
        }
      />
    </div>
  );
}
