import { createPageAction } from "@/lib/admin-actions";
import { PAGE_TEMPLATES } from "@/lib/blocks";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  nom: "Merci d'indiquer un nom de page.",
  slug: "Cette adresse n'est pas utilisable (réservée ou vide).",
  "slug-existe": "Une page existe déjà à cette adresse.",
};

export default async function NewPagePage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;

  return (
    <>
      <h1>Créer une page</h1>
      <p className="subtitle">
        Choisissez un modèle de départ, puis personnalisez tout dans le constructeur visuel (aperçu
        en direct). La page est créée en brouillon.
      </p>
      {erreur && <div className="notice erreur">{ERRORS[erreur] ?? "Erreur inconnue."}</div>}

      <form action={createPageAction}>
        <div className="panel">
          <h2>Modèle de départ</h2>
          <div className="templates-grille">
            {PAGE_TEMPLATES.map((template, index) => (
              <label className="template-carte" key={template.id}>
                <input
                  type="radio"
                  name="template"
                  value={template.id}
                  defaultChecked={index === 0}
                />
                <span className="template-carte-contenu">
                  <span className="template-icone">{template.icon}</span>
                  <span className="template-nom">{template.label}</span>
                  <span className="template-desc">{template.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Informations</h2>
          <div className="grille-2">
            <label className="champ">
              Nom de la page <span className="aide">(titre affiché, ex : « Nos ateliers »)</span>
              <input type="text" name="name" required maxLength={150} />
            </label>
            <label className="champ">
              Adresse <span className="aide">(laisser vide pour la générer depuis le nom)</span>
              <input type="text" name="slug" placeholder="ex : nos-ateliers" maxLength={100} />
            </label>
          </div>
          <label className="champ">
            Description pour les moteurs de recherche <span className="aide">(facultatif)</span>
            <textarea name="metaDescription" rows={2} maxLength={300} />
          </label>
          <label className="champ-inline">
            <input type="checkbox" name="addToMenu" value="1" />
            Ajouter la page au menu du site
          </label>
          <button type="submit" className="btn principal">
            Créer et ouvrir le constructeur
          </button>
        </div>
      </form>
    </>
  );
}
