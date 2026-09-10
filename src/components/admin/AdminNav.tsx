"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  href: string;
  label: string;
  exact?: boolean;
  badgeKey?: "messages" | "orders";
};

type NavGroup = {
  title: string;
  links: readonly NavLink[];
};

const GROUPS: readonly NavGroup[] = [
  {
    title: "Contenu",
    links: [
      { href: "/admin", label: "Tableau de bord", exact: true },
      { href: "/admin/pages", label: "Pages" },
      { href: "/admin/accueil", label: "Bannière d'accueil" },
      { href: "/admin/widgets", label: "Widgets" },
      { href: "/admin/menu", label: "Menu du site" },
    ],
  },
  {
    title: "Boutique",
    links: [
      { href: "/admin/produits", label: "Livres" },
      { href: "/admin/commandes", label: "Commandes", badgeKey: "orders" },
    ],
  },
  {
    title: "Communication",
    links: [{ href: "/admin/messages", label: "Messages", badgeKey: "messages" }],
  },
  {
    title: "Système",
    links: [{ href: "/admin/parametres", label: "Réglages" }],
  },
] as const;

export function AdminNav({
  badges,
}: {
  badges: { messages: number; orders: number };
}) {
  const pathname = usePathname();
  return (
    <nav className="admin-nav">
      {GROUPS.map((group) => (
        <div className="admin-nav-group" key={group.title}>
          <div className="admin-nav-title">{group.title}</div>
          {group.links.map((link) => {
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            const badge = link.badgeKey ? badges[link.badgeKey] : 0;
            return (
              <Link key={link.href} href={link.href} className={active ? "active" : undefined}>
                {link.label}
                {badge > 0 && <span className="badge-nav">{badge}</span>}
              </Link>
            );
          })}
        </div>
      ))}
      <div className="admin-nav-group">
        <a href="/" target="_blank" rel="noreferrer">
          Voir le site ↗
        </a>
      </div>
    </nav>
  );
}
