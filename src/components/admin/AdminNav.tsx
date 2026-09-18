"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
  badgeKey?: "messages" | "orders";
  external?: boolean;
};

type NavGroup = {
  title: string;
  links: readonly NavLink[];
};

const ICONS: Record<string, string> = {
  dash: "M4 4h7v7H4V4zm9 0h7v4h-7V4zM4 13h7v7H4v-7zm9 6h7v4h-7v-4zm0-6h7v4h-7v-4z",
  pages: "M7 3h8l5 5v13H7V3zm8 1.5V9h4.5",
  hero: "M4 6h16v10H4V6zm2 12h4m4 0h6",
  widgets: "M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z",
  menu: "M4 7h16M4 12h16M4 17h16",
  books: "M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3V4zm0 0v16",
  orders: "M6 7h12l1 12H5L6 7zm3-3h6l1 3H8l1-3z",
  crm: "M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1m8-11a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm5 4a3 3 0 1 0 0-6",
  messages: "M4 6h16v12H4V6zm0 0 8 7 8-7",
  settings: "M5 8h14M5 16h14M8 6v4M16 14v4",
  site: "M5 12h14M13 6l6 6-6 6",
};

const GROUPS: readonly NavGroup[] = [
  {
    title: "Contenu",
    links: [
      { href: "/admin", label: "Tableau de bord", icon: "dash", exact: true },
      { href: "/admin/pages", label: "Pages", icon: "pages" },
      { href: "/admin/accueil", label: "Bannière d'accueil", icon: "hero" },
      { href: "/admin/widgets", label: "Widgets", icon: "widgets" },
      { href: "/admin/menu", label: "Menu du site", icon: "menu" },
    ],
  },
  {
    title: "Boutique",
    links: [
      { href: "/admin/produits", label: "Livres", icon: "books" },
      { href: "/admin/commandes", label: "Commandes", icon: "orders", badgeKey: "orders" },
      { href: "/admin/crm", label: "Clients & CRM", icon: "crm" },
    ],
  },
  {
    title: "Communication",
    links: [{ href: "/admin/messages", label: "Messages", icon: "messages", badgeKey: "messages" }],
  },
  {
    title: "Système",
    links: [{ href: "/admin/parametres", label: "Réglages", icon: "settings" }],
  },
];

function NavIcon({ name }: { name: string }) {
  const d = ICONS[name];
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function AdminNav({
  badges,
  collapsed = false,
}: {
  badges: { messages: number; orders: number };
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  return (
    <nav className="admin-nav" aria-label="Navigation de l'administration">
      {GROUPS.map((group) => (
        <div className="admin-nav-group" key={group.title}>
          <div className="admin-nav-title">{group.title}</div>
          {group.links.map((link) => {
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            const badge = link.badgeKey ? badges[link.badgeKey] : 0;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? "active" : undefined}
                title={collapsed ? `${link.label}${badge > 0 ? ` (${badge})` : ""}` : undefined}
                aria-current={active ? "page" : undefined}
              >
                <NavIcon name={link.icon} />
                <span className="nav-label">{link.label}</span>
                {badge > 0 && <span className="badge-nav">{badge}</span>}
              </Link>
            );
          })}
        </div>
      ))}
      <div className="admin-nav-group">
        <a href="/" target="_blank" rel="noreferrer" title={collapsed ? "Voir le site" : undefined}>
          <NavIcon name="site" />
          <span className="nav-label">Voir le site</span>
        </a>
      </div>
    </nav>
  );
}
