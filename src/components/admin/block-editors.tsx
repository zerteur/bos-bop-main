"use client";

import type { Block, TextAlign } from "@/lib/blocks";
import { ImagePicker } from "./ImagePicker";

// Éditeurs de champs propres à chaque type de bloc.
// Chaque éditeur reçoit le bloc courant et une fonction de mise à jour.

type Update<T extends Block> = (patch: Partial<T>) => void;

const TEXT_HELP =
  "Une ligne = un paragraphe. Commencez une ligne par « - » pour une puce. Le HTML est accepté.";

function AlignField({ value, onChange }: { value: TextAlign; onChange: (v: TextAlign) => void }) {
  return (
    <label className="champ">
      Alignement
      <select value={value} onChange={(e) => onChange(e.target.value as TextAlign)}>
        <option value="left">Gauche</option>
        <option value="center">Centré</option>
        <option value="right">Droite</option>
      </select>
    </label>
  );
}

function ButtonFields({
  label,
  url,
  onLabel,
  onUrl,
}: {
  label: string;
  url: string;
  onLabel: (v: string) => void;
  onUrl: (v: string) => void;
}) {
  return (
    <div className="grille-2">
      <label className="champ">
        Texte du bouton <span className="aide">(laisser vide = pas de bouton)</span>
        <input type="text" value={label} onChange={(e) => onLabel(e.target.value)} />
      </label>
      <label className="champ">
        Lien du bouton
        <input type="text" value={url} onChange={(e) => onUrl(e.target.value)} placeholder="/contact-…" />
      </label>
    </div>
  );
}

export function BlockEditorFields({
  block,
  update,
}: {
  block: Block;
  update: (patch: Partial<Block>) => void;
}) {
  switch (block.type) {
    case "hero": {
      const u = update as Update<typeof block>;
      return (
        <>
          <label className="champ">
            Titre <span className="aide">(une ligne = un retour à la ligne)</span>
            <textarea rows={2} value={block.title} onChange={(e) => u({ title: e.target.value })} />
          </label>
          <label className="champ">
            Sous-titre <span className="aide">(facultatif)</span>
            <input type="text" value={block.subtitle} onChange={(e) => u({ subtitle: e.target.value })} />
          </label>
          <ImagePicker
            label="Image de fond (facultatif)"
            value={block.imageUrl}
            onChange={(url) => u({ imageUrl: url })}
          />
          <ButtonFields
            label={block.buttonLabel}
            url={block.buttonUrl}
            onLabel={(v) => u({ buttonLabel: v })}
            onUrl={(v) => u({ buttonUrl: v })}
          />
        </>
      );
    }

    case "richtext": {
      const u = update as Update<typeof block>;
      return (
        <>
          <div className="grille-2">
            <label className="champ">
              Titre <span className="aide">(laisser vide = pas de titre)</span>
              <input type="text" value={block.heading} onChange={(e) => u({ heading: e.target.value })} />
            </label>
            <label className="champ">
              Niveau du titre
              <select
                value={block.headingLevel}
                onChange={(e) => u({ headingLevel: e.target.value as "h2" | "h3" })}
              >
                <option value="h2">Titre principal (h2)</option>
                <option value="h3">Sous-titre (h3)</option>
              </select>
            </label>
          </div>
          <label className="champ">
            Texte <span className="aide">— {TEXT_HELP}</span>
            <textarea rows={6} value={block.body} onChange={(e) => u({ body: e.target.value })} />
          </label>
          <AlignField value={block.align} onChange={(v) => u({ align: v })} />
        </>
      );
    }

    case "columns": {
      const u = update as Update<typeof block>;
      const count = block.count;
      const setCount = (n: number) => {
        const columns = [...block.columns];
        while (columns.length < n) columns.push({ heading: "", body: "" });
        u({ count: n, columns: columns.slice(0, Math.max(n, columns.length)) });
      };
      return (
        <>
          <label className="champ">
            Nombre de colonnes
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              <option value={2}>2 colonnes</option>
              <option value={3}>3 colonnes</option>
              <option value={4}>4 colonnes</option>
            </select>
          </label>
          <div className="grille-2">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i}>
                <label className="champ">
                  Colonne {i + 1} — titre
                  <input
                    type="text"
                    value={block.columns[i]?.heading ?? ""}
                    onChange={(e) => {
                      const columns = [...block.columns];
                      columns[i] = { ...(columns[i] ?? { heading: "", body: "" }), heading: e.target.value };
                      u({ columns });
                    }}
                  />
                </label>
                <label className="champ">
                  Colonne {i + 1} — texte
                  <textarea
                    rows={4}
                    value={block.columns[i]?.body ?? ""}
                    onChange={(e) => {
                      const columns = [...block.columns];
                      columns[i] = { ...(columns[i] ?? { heading: "", body: "" }), body: e.target.value };
                      u({ columns });
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
        </>
      );
    }

    case "cards": {
      const u = update as Update<typeof block>;
      const setCard = (i: number, patch: Partial<{ title: string; body: string }>) => {
        const cards = [...block.cards];
        cards[i] = { ...cards[i], ...patch };
        u({ cards });
      };
      return (
        <>
          <label className="champ">
            Titre de la section <span className="aide">(facultatif)</span>
            <input type="text" value={block.heading} onChange={(e) => u({ heading: e.target.value })} />
          </label>
          <label className="champ">
            Texte d&apos;introduction <span className="aide">(facultatif)</span>
            <textarea rows={2} value={block.intro} onChange={(e) => u({ intro: e.target.value })} />
          </label>
          {block.cards.map((card, i) => (
            <div className="sous-bloc" key={i}>
              <div className="sous-bloc-entete">
                <strong>Carte {i + 1}</strong>
                <button
                  type="button"
                  className="btn danger petit"
                  onClick={() => u({ cards: block.cards.filter((_, j) => j !== i) })}
                  disabled={block.cards.length <= 1}
                >
                  Retirer
                </button>
              </div>
              <label className="champ">
                Titre
                <input type="text" value={card.title} onChange={(e) => setCard(i, { title: e.target.value })} />
              </label>
              <label className="champ">
                Texte
                <textarea rows={3} value={card.body} onChange={(e) => setCard(i, { body: e.target.value })} />
              </label>
            </div>
          ))}
          <button
            type="button"
            className="btn secondaire petit"
            onClick={() => u({ cards: [...block.cards, { title: "Nouvelle carte", body: "" }] })}
            disabled={block.cards.length >= 4}
          >
            + Ajouter une carte
          </button>
        </>
      );
    }

    case "imageText": {
      const u = update as Update<typeof block>;
      return (
        <>
          <ImagePicker value={block.imageUrl} onChange={(url) => u({ imageUrl: url })} />
          <label className="champ">
            Position de l&apos;image
            <select
              value={block.imagePosition}
              onChange={(e) => u({ imagePosition: e.target.value as "left" | "right" })}
            >
              <option value="left">À gauche</option>
              <option value="right">À droite</option>
            </select>
          </label>
          <label className="champ">
            Titre
            <input type="text" value={block.heading} onChange={(e) => u({ heading: e.target.value })} />
          </label>
          <label className="champ">
            Texte <span className="aide">— {TEXT_HELP}</span>
            <textarea rows={5} value={block.body} onChange={(e) => u({ body: e.target.value })} />
          </label>
          <ButtonFields
            label={block.buttonLabel}
            url={block.buttonUrl}
            onLabel={(v) => u({ buttonLabel: v })}
            onUrl={(v) => u({ buttonUrl: v })}
          />
        </>
      );
    }

    case "image": {
      const u = update as Update<typeof block>;
      return (
        <>
          <ImagePicker value={block.url} onChange={(url) => u({ url })} />
          <label className="champ">
            Texte alternatif <span className="aide">(description de l&apos;image)</span>
            <input type="text" value={block.alt} onChange={(e) => u({ alt: e.target.value })} />
          </label>
          <div className="grille-2">
            <label className="champ">
              Largeur (%)
              <input
                type="number"
                min={10}
                max={100}
                value={block.width}
                onChange={(e) => u({ width: e.target.value })}
              />
            </label>
            <AlignField value={block.align} onChange={(v) => u({ align: v })} />
          </div>
        </>
      );
    }

    case "cta": {
      const u = update as Update<typeof block>;
      return (
        <>
          <label className="champ">
            Titre
            <input type="text" value={block.heading} onChange={(e) => u({ heading: e.target.value })} />
          </label>
          <label className="champ">
            Texte
            <textarea rows={2} value={block.body} onChange={(e) => u({ body: e.target.value })} />
          </label>
          <ButtonFields
            label={block.buttonLabel}
            url={block.buttonUrl}
            onLabel={(v) => u({ buttonLabel: v })}
            onUrl={(v) => u({ buttonUrl: v })}
          />
        </>
      );
    }

    case "button": {
      const u = update as Update<typeof block>;
      return (
        <>
          <div className="grille-2">
            <label className="champ">
              Texte du bouton
              <input type="text" value={block.label} onChange={(e) => u({ label: e.target.value })} />
            </label>
            <label className="champ">
              Lien
              <input type="text" value={block.url} onChange={(e) => u({ url: e.target.value })} />
            </label>
          </div>
          <div className="grille-2">
            <AlignField value={block.align} onChange={(v) => u({ align: v })} />
            <label className="champ-inline" style={{ marginTop: 28 }}>
              <input
                type="checkbox"
                checked={block.newTab}
                onChange={(e) => u({ newTab: e.target.checked })}
              />
              Ouvrir dans un nouvel onglet
            </label>
          </div>
        </>
      );
    }

    case "spacer": {
      const u = update as Update<typeof block>;
      return (
        <label className="champ">
          Taille de l&apos;espace
          <select value={block.size} onChange={(e) => u({ size: e.target.value as "petit" | "moyen" | "grand" })}>
            <option value="petit">Petit</option>
            <option value="moyen">Moyen</option>
            <option value="grand">Grand</option>
          </select>
        </label>
      );
    }

    case "separator":
      return <p className="aide">Une ligne horizontale sera insérée.</p>;

    case "html": {
      const u = update as Update<typeof block>;
      return (
        <label className="champ">
          Code HTML{" "}
          <span className="aide">
            — pour les utilisateurs avancés. Le contenu des pages du site d&apos;origine apparaît ici
            et se modifie avec prudence.
          </span>
          <textarea
            className="code"
            rows={12}
            value={block.html}
            onChange={(e) => u({ html: e.target.value })}
          />
        </label>
      );
    }

    default:
      return <p className="aide">Type de bloc inconnu.</p>;
  }
}
