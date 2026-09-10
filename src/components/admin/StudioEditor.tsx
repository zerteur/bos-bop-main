"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BLOCK_DEFINITION_BY_TYPE,
  createBlock,
  type Block,
  type BlockType,
} from "@/lib/blocks";
import { BlockEditorFields } from "./block-editors";
import { BlockPalette } from "./BlockPalette";

export type StudioPage = {
  id: number;
  slug: string;
  breadcrumbLabel: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  published: boolean;
  isHome: boolean;
  isLegacy: boolean;
  blocks: Block[];
};

type EditMessage =
  | { type: "ready" }
  | { type: "select"; index: number }
  | { type: "edit"; index: number; path: string; value: string }
  | { type: "action"; action: "up" | "down" | "duplicate" | "delete" | "settings"; index: number }
  | { type: "action"; action: "reorder"; index: number; to: number }
  | { type: "insert"; at: number };

/** Applique une valeur à un chemin pointé (ex "columns.1.heading") d'un bloc. */
function setByPath(block: Block, path: string, value: string): Block {
  const clone: Record<string, unknown> = JSON.parse(JSON.stringify(block));
  const parts = path.split(".");
  let cur: Record<string, unknown> = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    cur = cur[k] as Record<string, unknown>;
    if (cur == null) return block;
  }
  cur[parts[parts.length - 1]] = value;
  return clone as unknown as Block;
}

export function StudioEditor({ page }: { page: StudioPage }) {
  const [items, setItems] = useState<Block[]>(page.blocks);
  const [selected, setSelected] = useState<number | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [paletteAt, setPaletteAt] = useState<number | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inspectorOpenMobile, setInspectorOpenMobile] = useState(false);

  const [meta, setMeta] = useState({
    name: page.breadcrumbLabel,
    slug: page.slug,
    title: page.title,
    metaDescription: page.metaDescription,
    metaKeywords: page.metaKeywords,
    published: page.published,
  });

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const selectedRef = useRef<number | null>(null);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  const [refreshNonce, setRefreshNonce] = useState(0);
  const refreshNow = useCallback(() => setRefreshNonce((n) => n + 1), []);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => setRefreshNonce((n) => n + 1), 400);
  }, []);

  // --- (re)génère l'aperçu éditable dans l'iframe -------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRefreshing(true);
      try {
        const res = await fetch("/api/admin/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ blocks: items, isHome: page.isHome, editor: true }),
        });
        if (res.ok && !cancelled) setPreviewHtml(await res.text());
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshNonce]);

  // --- messages venant de l'iframe ----------------------------------------
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data as (EditMessage & { source?: string });
      if (!d || d.source !== "bd-editor") return;
      switch (d.type) {
        case "ready": {
          const sel = selectedRef.current;
          if (sel !== null) iframeRef.current?.contentWindow?.postMessage({ type: "select", index: sel }, "*");
          break;
        }
        case "select":
          setSelected(d.index);
          break;
        case "edit":
          setDirty(true);
          setItems((prev) => prev.map((b, i) => (i === d.index ? setByPath(b, d.path, d.value) : b)));
          break;
        case "insert":
          setPaletteAt(d.at);
          break;
        case "action":
          handleAction(d.action, d.index, d.action === "reorder" ? d.to : undefined);
          break;
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAction = useCallback(
    (action: string, index: number, to?: number) => {
      setDirty(true);
      setItems((prev) => {
        const copy = [...prev];
        if (action === "up" && index > 0) {
          [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
          setSelected(index - 1);
        } else if (action === "down" && index < copy.length - 1) {
          [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
          setSelected(index + 1);
        } else if (action === "duplicate") {
          copy.splice(index + 1, 0, JSON.parse(JSON.stringify(copy[index])));
          setSelected(index + 1);
        } else if (action === "delete") {
          copy.splice(index, 1);
          setSelected(null);
        } else if (action === "settings") {
          setSelected(index);
          setInspectorOpenMobile(true);
        } else if (action === "reorder" && to !== undefined) {
          const [moved] = copy.splice(index, 1);
          const dest = to > index ? to - 1 : to;
          copy.splice(dest, 0, moved);
          setSelected(dest);
        }
        return copy;
      });
      if (action !== "settings") refreshNow();
    },
    [refreshNow],
  );

  const addBlock = useCallback(
    (type: BlockType) => {
      const at = paletteAt ?? items.length;
      setDirty(true);
      setItems((prev) => {
        const copy = [...prev];
        copy.splice(at, 0, createBlock(type));
        return copy;
      });
      setSelected(at);
      setPaletteAt(null);
      refreshNow();
    },
    [paletteAt, items.length, refreshNow],
  );

  // --- inspecteur : édition des propriétés du bloc sélectionné -------------
  const inspectorUpdate = useCallback(
    (patch: Partial<Block>) => {
      setDirty(true);
      setItems((prev) => prev.map((b, i) => (i === selected ? ({ ...b, ...patch } as Block) : b)));
      scheduleRefresh();
    },
    [selected, scheduleRefresh],
  );

  // --- enregistrement ------------------------------------------------------
  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pages/${page.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ blocks: items, ...meta }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Échec de l'enregistrement.");
      } else {
        setDirty(false);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2000);
        if (data.slug !== undefined && data.slug !== meta.slug) {
          setMeta((m) => ({ ...m, slug: data.slug }));
        }
      }
    } catch {
      setError("Échec de l'enregistrement (réseau).");
    } finally {
      setSaving(false);
    }
  }, [page.id, items, meta]);

  // Ctrl/Cmd+S pour enregistrer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  // Avertir avant de quitter si non enregistré
  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty]);

  const publicPath = meta.slug === "" ? "/" : `/${meta.slug}`;
  const selectedBlock = selected !== null ? items[selected] : null;
  const selectedDef = selectedBlock ? BLOCK_DEFINITION_BY_TYPE[selectedBlock.type] : null;

  return (
    <div className="studio">
      {/* Barre supérieure */}
      <header className="studio-topbar">
        <div className="studio-topbar-left">
          <Link href="/admin/pages" className="studio-back" title="Retour aux pages">←</Link>
          <div className="studio-title">
            <input
              value={meta.name}
              onChange={(e) => { setMeta((m) => ({ ...m, name: e.target.value })); setDirty(true); }}
              className="studio-title-input"
              aria-label="Nom de la page"
            />
            <span className="studio-path">{publicPath}</span>
          </div>
        </div>

        <div className="studio-topbar-center">
          <div className="studio-device">
            <button type="button" className={device === "desktop" ? "active" : ""} onClick={() => setDevice("desktop")} title="Ordinateur">🖥️</button>
            <button type="button" className={device === "mobile" ? "active" : ""} onClick={() => setDevice("mobile")} title="Mobile">📱</button>
          </div>
          <span className="studio-state">{refreshing ? "…" : dirty ? "Modifications non enregistrées" : savedFlash ? "Enregistré ✓" : "À jour"}</span>
        </div>

        <div className="studio-topbar-right">
          <label className="studio-publish" title="Rendre la page visible sur le site">
            <input
              type="checkbox"
              checked={meta.published}
              disabled={page.isHome}
              onChange={(e) => { setMeta((m) => ({ ...m, published: e.target.checked })); setDirty(true); }}
            />
            <span>{meta.published ? "Publiée" : "Brouillon"}</span>
          </label>
          <button type="button" className="btn secondaire" onClick={() => setSettingsOpen(true)}>Paramètres</button>
          <a href={publicPath} target="_blank" rel="noreferrer" className="btn secondaire">Voir ↗</a>
          <button type="button" className="btn principal" onClick={() => void save()} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </header>

      {error && <div className="studio-error">{error}</div>}

      <div className="studio-body">
        {/* Palette latérale d'ajout rapide */}
        <aside className="studio-rail">
          <button type="button" className="btn principal studio-rail-add" onClick={() => setPaletteAt(items.length)}>
            + Ajouter un bloc
          </button>
          <p className="studio-rail-aide">
            Cliquez sur un texte dans la page pour le modifier directement. Sélectionnez un bloc pour
            la barre d&apos;outils (déplacer, dupliquer, réglages, supprimer) et les options à droite.
          </p>
          {items.length === 0 && (
            <p className="studio-rail-aide"><strong>Page vide.</strong> Ajoutez un premier bloc.</p>
          )}
        </aside>

        {/* Canvas d'édition (rendu réel du site, éditable) */}
        <main className={`studio-canvas ${device}`}>
          <div className="studio-frame-wrap">
            <iframe
              ref={iframeRef}
              title="Édition de la page"
              className="studio-frame"
              srcDoc={previewHtml}
            />
          </div>
        </main>

        {/* Inspecteur du bloc sélectionné */}
        <aside className={`studio-inspector ${inspectorOpenMobile ? "ouvert-mobile" : ""}`}>
          <div className="studio-inspector-entete">
            <strong>{selectedDef ? `${selectedDef.icon} ${selectedDef.label}` : "Aucun bloc sélectionné"}</strong>
            <button type="button" className="studio-inspector-fermer" onClick={() => setInspectorOpenMobile(false)}>×</button>
          </div>
          <div className="studio-inspector-corps">
            {selectedBlock ? (
              <BlockEditorFields block={selectedBlock} update={inspectorUpdate} />
            ) : (
              <p className="aide">Cliquez sur un bloc dans la page pour afficher ses options ici.</p>
            )}
          </div>
        </aside>
      </div>

      {/* Palette d'insertion */}
      {paletteAt !== null && (
        <BlockPalette onPick={addBlock} onClose={() => setPaletteAt(null)} />
      )}

      {/* Tiroir Paramètres de la page */}
      {settingsOpen && (
        <div className="palette-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="studio-settings" onClick={(e) => e.stopPropagation()}>
            <div className="palette-entete">
              <h2>Paramètres de la page</h2>
              <button type="button" className="btn secondaire petit" onClick={() => setSettingsOpen(false)}>Fermer</button>
            </div>
            <label className="champ">
              Nom de la page
              <input value={meta.name} onChange={(e) => { setMeta((m) => ({ ...m, name: e.target.value })); setDirty(true); }} maxLength={150} />
            </label>
            <label className="champ">
              Adresse
              {page.isLegacy ? (
                <input value={publicPath} disabled title="Adresse conservée pour le référencement" />
              ) : (
                <input value={meta.slug} onChange={(e) => { setMeta((m) => ({ ...m, slug: e.target.value })); setDirty(true); }} maxLength={100} />
              )}
            </label>
            <label className="champ">
              Titre de l&apos;onglet du navigateur <span className="aide">(&lt;title&gt;)</span>
              <input value={meta.title} onChange={(e) => { setMeta((m) => ({ ...m, title: e.target.value })); setDirty(true); }} maxLength={300} />
            </label>
            <label className="champ">
              Description (moteurs de recherche)
              <textarea rows={3} value={meta.metaDescription} onChange={(e) => { setMeta((m) => ({ ...m, metaDescription: e.target.value })); setDirty(true); }} maxLength={500} />
            </label>
            <label className="champ">
              Mots-clés <span className="aide">(séparés par des virgules)</span>
              <textarea rows={2} value={meta.metaKeywords} onChange={(e) => { setMeta((m) => ({ ...m, metaKeywords: e.target.value })); setDirty(true); }} maxLength={300} />
            </label>
            <button type="button" className="btn principal" onClick={() => { setSettingsOpen(false); void save(); }}>
              Enregistrer les paramètres
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
