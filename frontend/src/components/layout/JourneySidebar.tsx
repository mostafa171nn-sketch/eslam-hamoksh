"use client";

import { Home, BookOpen, Compass, Wallet, Settings, X } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useT, type Dict } from "../../i18n";

interface JourneyNavItem {
  to: string;
  labelKey: keyof Dict;
  icon: React.ComponentType<{ className?: string }>;
}

const JOURNEY_NAV: JourneyNavItem[] = [
  { to: "/student", labelKey: "navHome", icon: Home },
  { to: "/student/learning", labelKey: "navLearning", icon: BookOpen },
  { to: "/student/journey", labelKey: "navJourney", icon: Compass },
  { to: "/student/finance", labelKey: "financeStudent", icon: Wallet },
  { to: "/student/account", labelKey: "settings", icon: Settings },
];

export function JourneySidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { dir, t } = useT();
  const pathname = usePathname();
  const isActive = (to: string) => pathname === to || (to === "/student/journey" && pathname?.startsWith("/student/journey"));

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 start-0 z-50 flex w-64 flex-col overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 transition-[width] duration-300 ease-out-expo lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : dir === "rtl" ? "translate-x-full" : "-translate-x-full"
        }`}
      >
        <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-white/5 px-5">
          <span className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-brand">
              <Compass className="h-5 w-5 text-white" />
            </span>
            <span className="truncate text-lg font-bold tracking-tight text-white">{t("studentJourneyLabel")}</span>
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label={t("closeMenu")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="mt-2 flex-1 overflow-y-auto px-3 pb-4">
          {JOURNEY_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                href={item.to}
                onClick={onClose}
                className={`group mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-white/10 text-white shadow-sm" : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
