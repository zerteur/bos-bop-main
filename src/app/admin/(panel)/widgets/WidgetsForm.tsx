"use client";

import { useState } from "react";

// Formulaire des widgets avec aperçu en direct : on voit immédiatement, sur un
// fond marine reproduisant l'en-tête/pied de page du site, l'effet de chaque
// champ (numéro, bouton Facebook, lien LinkedIn). Un champ laissé vide restaure
// le comportement d'origine — l'aperçu l'indique explicitement.

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  initial: {
    phone: string;
    facebookUrl: string;
    linkedinUrl: string;
    shareBarEnabled: boolean;
    shareFacebookUrl: string;
    shareTwitterUrl: string;
    shareLinkedinUrl: string;
  };
};

const ORIGINAL_PHONE = "06.48.69.20.36";
const GOLD = "#ddc076";
const NAVY = "#102f40";

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke={GOLD} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 3.5h3l1.2 4-2 1.3c1 2.2 2.8 4 5 5l1.3-2 4 1.2v3c0 1.1-.9 2-2 2-8 0-14.5-6.5-14.5-14.5 0-1.1.9-2 2-2z" />
  </svg>
);

const CartIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke={GOLD} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4h2.2l2.4 11.2a1.6 1.6 0 0 0 1.57 1.3h7.9a1.6 1.6 0 0 0 1.56-1.22L20.5 8H6.1" />
    <circle cx="10" cy="20" r="1.4" />
    <circle cx="17.5" cy="20" r="1.4" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="currentColor">
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.9h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94z" />
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 32 32" width="16" height="16" aria-hidden="true" fill="#fff">
    <path d="M28 8.557a10 10 0 0 1-2.828.775 4.93 4.93 0 0 0 2.166-2.725 9.7 9.7 0 0 1-3.13 1.194 4.92 4.92 0 0 0-3.593-1.55 4.924 4.924 0 0 0-4.794 6.049c-4.09-.21-7.72-2.17-10.15-5.15a4.94 4.94 0 0 0-.665 2.477c0 1.71.87 3.214 2.19 4.1a5 5 0 0 1-2.23-.616v.06c0 2.39 1.7 4.38 3.952 4.83-.414.115-.85.174-1.297.174q-.476-.001-.928-.086a4.935 4.935 0 0 0 4.6 3.42 9.9 9.9 0 0 1-6.114 2.107q-.597 0-1.175-.068a13.95 13.95 0 0 0 7.55 2.213c9.056 0 14.01-7.507 14.01-14.013q0-.32-.015-.637c.96-.695 1.795-1.56 2.455-2.55z" />
  </svg>
);

const SmallLinkedinIcon = () => (
  <svg viewBox="0 0 32 32" width="16" height="16" aria-hidden="true" fill="#fff">
    <path d="M6.227 12.61h4.19v13.48h-4.19zm2.095-6.7a2.43 2.43 0 0 1 0 4.86c-1.344 0-2.428-1.09-2.428-2.43s1.084-2.43 2.428-2.43m4.72 6.7h4.02v1.84h.058c.56-1.058 1.927-2.176 3.965-2.176 4.238 0 5.02 2.792 5.02 6.42v7.395h-4.183v-6.56c0-1.564-.03-3.574-2.178-3.574-2.18 0-2.514 1.7-2.514 3.46v6.668h-4.187z" />
  </svg>
);

const ShareMoreIcon = () => (
  <svg viewBox="0 0 32 32" width="16" height="16" aria-hidden="true" fill="#fff">
    <path d="M14 7h4v18h-4z" />
    <path d="M7 14h18v4H7z" />
  </svg>
);

function PreviewFrame({
  label,
  light,
  children,
}: {
  label: string;
  /** Fond blanc (en-tête du site) plutôt que marine (pied de page). */
  light?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".4px", color: "#8a8778", marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          background: light ? "#fff" : NAVY,
          border: light ? "1px solid #e3e0d8" : "none",
          borderRadius: 10,
          padding: 20,
          display: "flex",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ShareIcon({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        borderRadius: 4,
        background: GOLD,
      }}
    >
      {children}
    </span>
  );
}

export default function WidgetsForm({ action, initial }: Props) {
  const [phone, setPhone] = useState(initial.phone);
  const [facebookUrl, setFacebookUrl] = useState(initial.facebookUrl);
  const [linkedinUrl, setLinkedinUrl] = useState(initial.linkedinUrl);
  const [shareBarEnabled, setShareBarEnabled] = useState(initial.shareBarEnabled);
  const [shareFacebookUrl, setShareFacebookUrl] = useState(initial.shareFacebookUrl);
  const [shareTwitterUrl, setShareTwitterUrl] = useState(initial.shareTwitterUrl);
  const [shareLinkedinUrl, setShareLinkedinUrl] = useState(initial.shareLinkedinUrl);

  const phoneDisplay = phone.trim() || ORIGINAL_PHONE;

  return (
    <form action={action}>
      {/* --- Téléphone (en-tête) --- */}
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Téléphone</h2>
        <label className="champ">
          Numéro de téléphone
          <input
            name="widgetPhone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={ORIGINAL_PHONE}
            maxLength={30}
          />
        </label>
        <p className="subtitle">
          Affiché dans l&apos;en-tête et le pied de page. Le lien d&apos;appel (<code className="slug">tel:</code>)
          est calculé automatiquement. Laisser vide restaure le numéro d&apos;origine.
        </p>

        <PreviewFrame label="Aperçu de l'encadré en-tête" light>
          <div style={{ display: "flex", alignItems: "center", gap: 9, whiteSpace: "nowrap", fontSize: 16, fontWeight: 600, color: NAVY }}>
            <PhoneIcon />
            <span>{phoneDisplay}</span>
          </div>
        </PreviewFrame>
      </div>

      {/* --- Panier (boutique) --- */}
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Panier</h2>
        <p className="subtitle">
          Lorsque la boutique est activée (Réglages), un bouton « Mon panier » flottant, avec
          compteur d&apos;articles, apparaît en bas à droite de chaque page — séparé des
          coordonnées de contact, accessible partout pendant la navigation. Rien à régler ici.
        </p>
        <PreviewFrame label="Aperçu du bouton flottant">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              padding: "11px 18px",
              borderRadius: 26,
              background: NAVY,
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              boxShadow: "0 4px 16px rgba(16,47,64,.35)",
            }}
          >
            <span style={{ color: GOLD, display: "inline-flex" }}>
              <CartIcon />
            </span>
            <span>Mon panier</span>
            <span
              style={{
                minWidth: 21,
                height: 21,
                borderRadius: 11,
                background: GOLD,
                color: NAVY,
                fontSize: 12,
                lineHeight: "21px",
                textAlign: "center",
                padding: "0 6px",
                fontWeight: 700,
              }}
            >
              2
            </span>
          </div>
        </PreviewFrame>
      </div>

      {/* --- Facebook --- */}
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Facebook</h2>
        <label className="champ">
          Page Facebook <span className="aide">(adresse complète)</span>
          <input
            type="url"
            name="widgetFacebookUrl"
            value={facebookUrl}
            onChange={(e) => setFacebookUrl(e.target.value)}
            placeholder="https://www.facebook.com/…"
            maxLength={300}
          />
        </label>
        <p className="subtitle">
          Renseigner l&apos;adresse ici affiche dans le pied de page la vraie carte de la page
          Facebook (photo, nom, abonnés, boutons « Suivre la Page » / « Partager »), comme sur le
          site d&apos;origine — mais par le canal officiel actuel de Facebook, sans le script périmé
          qui affichait une image cassée. Laisser vide conserve le widget d&apos;origine tel quel.
        </p>
        <PreviewFrame label="Aperçu du pied de page">
          {facebookUrl.trim() ? (
            <div
              style={{
                background: "#fff",
                borderRadius: 4,
                padding: "12px 14px",
                width: 300,
                textAlign: "left",
                boxShadow: "0 1px 5px rgba(0,0,0,.35)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    flex: "0 0 auto",
                    width: 40,
                    height: 40,
                    border: "2px solid #111",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 10,
                    color: "#111",
                    textAlign: "center",
                    lineHeight: 1.1,
                  }}
                >
                  BOS
                  <br />
                  BOP
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      color: "#365899",
                      fontWeight: 700,
                      fontSize: 14,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    BOS et BOP — orientation scol…
                  </div>
                  <div style={{ color: "#90949c", fontSize: 12 }}>64 followers</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: "#f5f6f7",
                    border: "1px solid #ccd0d5",
                    borderRadius: 3,
                    padding: "3px 9px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#4b4f56",
                  }}
                >
                  <span style={{ color: "#365899", display: "inline-flex" }}>
                    <FacebookIcon />
                  </span>
                  Suivre la Page
                </span>
                <span
                  style={{
                    background: "#f5f6f7",
                    border: "1px solid #ccd0d5",
                    borderRadius: 3,
                    padding: "3px 9px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#4b4f56",
                  }}
                >
                  Partager
                </span>
              </div>
            </div>
          ) : (
            <span style={{ color: "#b9c2c9", fontStyle: "italic", fontSize: 14 }}>
              Widget Facebook d&apos;origine conservé
            </span>
          )}
        </PreviewFrame>
      </div>

      {/* --- LinkedIn --- */}
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>LinkedIn</h2>
        <label className="champ">
          Profil LinkedIn <span className="aide">(adresse complète)</span>
          <input
            type="url"
            name="widgetLinkedinUrl"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://www.linkedin.com/…"
            maxLength={300}
          />
        </label>
        <p className="subtitle">Laisser vide conserve le lien LinkedIn d&apos;origine.</p>
        <PreviewFrame label="Aperçu du lien">
          <a
            href={linkedinUrl.trim() || undefined}
            onClick={(e) => e.preventDefault()}
            style={{ color: GOLD, textDecoration: "none", fontWeight: 600, wordBreak: "break-all" }}
          >
            {linkedinUrl.trim() || "Lien LinkedIn d'origine conservé"}
          </a>
        </PreviewFrame>
      </div>

      {/* --- Barre de partage (en-tête) --- */}
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Barre de partage</h2>
        <label className="champ-inline">
          <input
            type="checkbox"
            name="widgetShareBarEnabled"
            value="1"
            checked={shareBarEnabled}
            onChange={(e) => setShareBarEnabled(e.target.checked)}
          />
          Afficher la barre « Facebook / Twitter / LinkedIn / Partager » dans l&apos;en-tête
        </label>
        <p className="subtitle">
          Les icônes Facebook, Twitter et LinkedIn de cette barre pointaient jusqu&apos;ici vers des
          liens morts (elles dépendaient d&apos;un script tiers jamais chargé). Décocher retire
          entièrement la barre du site.
        </p>
        <PreviewFrame label="Aperçu de l'en-tête">
          {shareBarEnabled ? (
            <div style={{ display: "flex", gap: 6 }}>
              <ShareIcon><FacebookIcon /></ShareIcon>
              <ShareIcon><TwitterIcon /></ShareIcon>
              <ShareIcon><SmallLinkedinIcon /></ShareIcon>
              <ShareIcon><ShareMoreIcon /></ShareIcon>
            </div>
          ) : (
            <span style={{ color: "#b9c2c9", fontStyle: "italic", fontSize: 14 }}>
              Barre masquée
            </span>
          )}
        </PreviewFrame>

        {shareBarEnabled && (
          <>
            <p className="subtitle" style={{ marginTop: 18, marginBottom: 4 }}>
              <strong>Destination de chaque icône.</strong> Laisser vide = l&apos;icône partage la
              page consultée (comportement par défaut). Renseigner une adresse = l&apos;icône y
              renvoie directement (par exemple votre page Facebook).
            </p>
            <label className="champ">
              Icône Facebook
              <input
                type="url"
                name="widgetShareFacebookUrl"
                value={shareFacebookUrl}
                onChange={(e) => setShareFacebookUrl(e.target.value)}
                placeholder="Par défaut : partage de la page"
                maxLength={300}
              />
            </label>
            <label className="champ">
              Icône Twitter / X
              <input
                type="url"
                name="widgetShareTwitterUrl"
                value={shareTwitterUrl}
                onChange={(e) => setShareTwitterUrl(e.target.value)}
                placeholder="Par défaut : partage de la page"
                maxLength={300}
              />
            </label>
            <label className="champ">
              Icône LinkedIn
              <input
                type="url"
                name="widgetShareLinkedinUrl"
                value={shareLinkedinUrl}
                onChange={(e) => setShareLinkedinUrl(e.target.value)}
                placeholder="Par défaut : partage de la page"
                maxLength={300}
              />
            </label>
          </>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
        <button type="submit" className="btn principal">
          Enregistrer tous les widgets
        </button>
      </div>
    </form>
  );
}
