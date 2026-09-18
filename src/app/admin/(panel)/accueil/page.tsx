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
      <div className="entete-page" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1f2430' }}>🖼️ Bannière d'accueil</h1>
          <p className="subtitle" style={{ margin: '4px 0 0 0', color: '#888', fontSize: '14px' }}>
            Titre et image de fond du grand bandeau affiché en haut de la page d'accueil.
          </p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="btn secondaire" style={{ borderRadius: '8px', padding: '10px 20px' }}>
          Voir l'accueil ➔
        </a>
      </div>
      
      {ok && <div className="notice ok" style={{ padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>Bannière enregistrée.</div>}

      <HeroForm initialTitle={heroTitle} initialImageUrl={heroImageUrl} />
    </>
  );
}
