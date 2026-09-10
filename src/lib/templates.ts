import { readFileSync } from "node:fs";
import { join } from "node:path";

// Gabarits HTML extraits du site Joomla d'origine (voir scripts/extract-legacy.mjs).
// Chargés une seule fois puis conservés en mémoire.

export type ShellTemplates = {
  docStart: string;
  preBody: string;
  header: string;
  footer: string;
  tail: string;
  breadcrumbHome: string;
  breadcrumbInner: string;
};

let shellCache: ShellTemplates | null = null;
let headNewCache: string | null = null;

const read = (name: string) =>
  readFileSync(join(process.cwd(), "templates", name), "utf-8");

export function getTemplates(): ShellTemplates {
  if (!shellCache) {
    shellCache = {
      docStart: read("docstart.html"),
      preBody: read("pre-body.html"),
      header: read("header.html"),
      footer: read("footer.html"),
      tail: read("tail.html"),
      breadcrumbHome: read("breadcrumb-home.html"),
      breadcrumbInner: read("breadcrumb-inner.html"),
    };
  }
  return shellCache;
}

/** Gabarit de <head> utilisé pour les pages créées depuis l'administration. */
export function getHeadTemplate(): string {
  if (!headNewCache) headNewCache = read("head-new.html");
  return headNewCache;
}
