import { getSetting } from "@/lib/settings";
import { HeroForm } from "@/components/admin/HeroForm";

export const dynamic = "force-dynamic";

export default async function HeroPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const [heroTitle, heroImageUrl] = await Promise.all([
    getSetting("heroTitle", ""),
    getSetting("heroImageUrl", ""),
  ]);

  return (
    <>
      <div className="entete-page">
        <h1>Bannière d&apos;accueil</h1>
        <a href="/" target="_blank" rel="noreferrer" className="btn secondaire">
          Voir l&apos;accueil ↗
        </a>
      </div>
      <p className="subtitle">
        Titre et image de fond du grand bandeau affiché en haut de la page d&apos;accueil.
      </p>
      {ok && <div className="notice ok">Bannière enregistrée.</div>}

      <HeroForm initialTitle={heroTitle} initialImageUrl={heroImageUrl} />
    </>
  );
}
