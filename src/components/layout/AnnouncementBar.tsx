import Link from "next/link";
import { getSiteSettings } from "@/server/modules/settings/service";

/** Shown only when enabled and non-empty in admin settings. */
export async function AnnouncementBar() {
  const s = await getSiteSettings().catch(() => null);
  if (!s || !s.announcementEnabled || !s.announcementText.trim()) return null;
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
