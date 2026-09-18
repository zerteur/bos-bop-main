"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/admin-actions";
import { AdminNav } from "./AdminNav";

const COLLAPSE_KEY = "bosbop-admin-nav-collapsed";

export function AdminShell({
  email,
  badges,
  children,
}: {
  email: string;
  badges: { messages: number; orders: number };
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const initial = email.trim().charAt(0).toUpperCase() || "A";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "[" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        setCollapsed((v) => {
          const next = !v;
          try {
            localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
          } catch {
            /* ignore */
          }
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("admin-nav-lock", open);
    return () => document.body.classList.remove("admin-nav-lock");
  }, [open]);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const shellClass = [
    "admin-shell",
    open ? "nav-open" : "",
    collapsed ? "nav-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass}>
      <header className="admin-mobile-bar">
        <button
          type="button"
          className="admin-nav-toggle"
          aria-expanded={open}
          aria-controls="admin-sidebar"
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
          <span className="sr-only">{open ? "Fermer le menu" : "Ouvrir le menu"}</span>
        </button>
        <strong>BOS &amp; BOP</strong>
        <span>Admin</span>
      </header>

      <aside className="admin-sidebar" id="admin-sidebar">
        <div className="brand">
          <div className="brand-text">
            <strong>BOS &amp; BOP</strong>
            <span>Administration</span>
          </div>
          <button
            type="button"
            className="sidebar-collapse"
            onClick={toggleCollapsed}
            title={collapsed ? "Déplier le menu ([)" : "Replier le menu ([)"}
            aria-pressed={collapsed}
          >
            <span className="sr-only">{collapsed ? "Déplier le menu" : "Replier le menu"}</span>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              {collapsed ? <path d="M9 6l6 6-6 6" /> : <path d="M15 6l-6 6 6 6" />}
            </svg>
          </button>
        </div>
        <AdminNav badges={badges} collapsed={collapsed} />
        <div className="sidebar-footer">
          <div className="sidebar-user" title={email}>
            <span className="sidebar-avatar" aria-hidden="true">{initial}</span>
            <span className="sidebar-email">{email}</span>
          </div>
          <form action={logoutAction}>
            <button type="submit" title="Se déconnecter">Se déconnecter</button>
          </form>
        </div>
      </aside>

      <div
        className="admin-nav-backdrop"
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <main className="admin-main">{children}</main>
    </div>
  );
}
