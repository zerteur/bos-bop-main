"use client";

import { BLOCK_DEFINITIONS, type BlockType } from "@/lib/blocks";

const GROUP_ORDER = ["Texte", "Média", "Mise en page", "Avancé"] as const;

/** Fenêtre modale de choix d'un type de bloc à insérer. */
export function BlockPalette({
  onPick,
  onClose,
}: {
  onPick: (type: BlockType) => void;
  onClose: () => void;
}) {
  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <div className="palette-entete">
          <h2>Ajouter un bloc</h2>
          <button type="button" className="btn secondaire petit" onClick={onClose}>
            Fermer
          </button>
        </div>
        {GROUP_ORDER.map((group) => {
          const defs = BLOCK_DEFINITIONS.filter((d) => d.group === group);
          if (defs.length === 0) return null;
          return (
            <div className="palette-groupe" key={group}>
              <div className="palette-groupe-titre">{group}</div>
              <div className="palette-grille">
                {defs.map((def) => (
                  <button
                    key={def.type}
                    type="button"
                    className="palette-item"
                    onClick={() => onPick(def.type)}
                  >
                    <span className="palette-item-icone">{def.icon}</span>
                    <span className="palette-item-nom">{def.label}</span>
                    <span className="palette-item-desc">{def.description}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
