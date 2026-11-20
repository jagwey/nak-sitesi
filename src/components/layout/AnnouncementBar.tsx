import Link from "next/link";
import type { SiteSettings } from "@/server/modules/settings/schema";

/** Shown only when enabled and non-empty in admin settings. */
export function AnnouncementBar({ site: s }: { site: SiteSettings }) {
  if (!s.announcementEnabled || !s.announcementText) return null;
  const cls = "block px-4 py-2 text-center text-[0.8125rem] text-[#F6F2EA]";
  return (
    <div role="status" className="relative z-30 bg-espresso">
      {s.announcementLink ? (
        s.announcementLink.startsWith("/") ? (
          <Link href={s.announcementLink} className={`${cls} underline-offset-2 hover:underline`}>{s.announcementText}</Link>
        ) : (
          <a href={s.announcementLink} rel="noopener noreferrer" className={`${cls} underline-offset-2 hover:underline`}>{s.announcementText}</a>
        )
      ) : (
        <p className={cls}>{s.announcementText}</p>
      )}
    </div>
  );
}
