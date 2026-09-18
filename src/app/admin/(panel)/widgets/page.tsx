import { getSetting } from "@/lib/settings";
import { saveWidgetsAction } from "@/lib/admin-actions";
import WidgetsForm from "./WidgetsForm";

export const dynamic = "force-dynamic";

export default async function WidgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const [
    phone,
    facebookUrl,
    linkedinUrl,
    shareBarEnabled,
    shareFacebookUrl,
    shareTwitterUrl,
    shareLinkedinUrl,
  ] = await Promise.all([
    getSetting("widgetPhone", ""),
    getSetting("widgetFacebookUrl", ""),
    getSetting("widgetLinkedinUrl", ""),
    getSetting("widgetShareBarEnabled", "1"),
    getSetting("widgetShareFacebookUrl", ""),
    getSetting("widgetShareTwitterUrl", ""),
    getSetting("widgetShareLinkedinUrl", ""),
  ]);

  return (
    <>
      <div className="entete-page" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1f2430' }}>⚙️ Widgets du Site</h1>
          <p className="subtitle" style={{ margin: '4px 0 0 0', color: '#888', fontSize: '14px' }}>
            Téléphone, réseaux sociaux et barre de partage dans l'en-tête et le pied de page.
          </p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="btn secondaire" style={{ borderRadius: '8px', padding: '10px 20px' }}>
          Voir le site ➔
        </a>
      </div>
      
      {ok && <div className="notice ok" style={{ padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>Widgets enregistrés.</div>}

      <WidgetsForm
        action={saveWidgetsAction}
        initial={{
          phone,
          facebookUrl,
          linkedinUrl,
          shareBarEnabled: shareBarEnabled !== "0",
          shareFacebookUrl,
          shareTwitterUrl,
          shareLinkedinUrl,
        }}
      />
    </>
  );
}
