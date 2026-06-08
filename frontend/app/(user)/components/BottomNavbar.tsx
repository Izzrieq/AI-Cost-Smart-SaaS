"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#1d4ed8" : "#94a3b8"} strokeWidth={active ? "2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
);

const ProdukIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#1d4ed8" : "#94a3b8"} strokeWidth={active ? "2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

const AnalisisIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#1d4ed8" : "#94a3b8"} strokeWidth={active ? "2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const SettingIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#1d4ed8" : "#94a3b8"} strokeWidth={active ? "2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

export default function BottomNavbar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Home",    href: "/home",    Icon: HomeIcon },
    { label: "Produk",  href: "/produk",  Icon: ProdukIcon },
    { label: "Analisis",href: "/analisis",Icon: AnalisisIcon },
    { label: "Setting", href: "/setting", Icon: SettingIcon },
  ];

  return (
    <>
      <nav className="floating-nav">
        {navItems.map(({ label, href, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`nav-btn ${active ? "nav-btn--active" : ""}`}
            >
              <span className="icon-wrap">
                <Icon active={active} />
                {active && <span className="active-dot" />}
              </span>
            </Link>
          );
        })}
      </nav>

      <style jsx>{`
        .floating-nav {
          position: fixed;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 5px;
          width: 70%;
          border-radius: 28px;
          justify-content: space-evenly;
          z-index: 1000;

          /* Glass */
          background: rgba(224, 242, 255, 0.55);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow:
            0 8px 32px rgba(59, 130, 246, 0.12),
            0 2px 8px rgba(0, 0, 0, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .nav-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border-radius: 20px;
          text-decoration: none;
          transition: background 0.2s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .nav-btn:hover {
          background: rgba(191, 219, 254, 0.35);
          transform: translateY(-2px);
        }

        .nav-btn:active {
          transform: scale(0.92);
        }

        .nav-btn--active {
          background: rgba(219, 234, 254, 0.7);
        }

        .nav-btn--active:hover {
          transform: translateY(-2px);
        }

        .icon-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-btn--active .icon-wrap svg {
          filter: drop-shadow(0 0 6px rgba(29, 78, 216, 0.3));
        }

        .active-dot {
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #2563eb;
        }
      `}</style>
    </>
  );
}