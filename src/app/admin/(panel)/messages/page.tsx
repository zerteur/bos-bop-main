import Link from "next/link";
import { prisma } from "@/lib/db";
import { deleteMessageAction, toggleMessageReadAction } from "@/lib/admin-actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <div className="entete-page" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1f2430' }}>✉️ Messages Reçus</h1>
          <p className="subtitle" style={{ margin: '4px 0 0 0', color: '#888', fontSize: '14px' }}>Les messages envoyés depuis le formulaire de contact du site.</p>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="panel" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', textAlign: 'center' }}>
          <p className="vide" style={{ color: '#888', fontStyle: 'italic' }}>Aucun message pour le moment.</p>
        </div>
      ) : (
        <div className="panel" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
          <table className="liste" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#666', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#666', fontWeight: 600 }}>De</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#666', fontWeight: 600 }}>Profil</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#666', fontWeight: 600 }}>Sujet</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', color: '#666', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f9f9f9', backgroundColor: m.isRead ? 'transparent' : '#f0fdf4', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '10px 8px', color: '#888' }}>{formatDate(m.createdAt)}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <Link href={`/admin/messages/${m.id}`} style={{ color: '#1f2430', fontWeight: m.isRead ? 500 : 700, textDecoration: 'none' }}>
                      {m.civility} {m.firstName} {m.lastName}
                    </Link>
                  </td>
                  <td style={{ padding: '10px 8px', color: '#666' }}>{m.audience}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <Link href={`/admin/messages/${m.id}`} style={{ color: '#1f2430', fontWeight: m.isRead ? 'normal' : 'bold', textDecoration: 'none' }}>{m.subject || "(sans sujet)"}</Link>
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <form action={toggleMessageReadAction} style={{ margin: 0 }}>
                        <input type="hidden" name="id" value={m.id} />
                        <button type="submit" className="btn secondaire petit" style={{ padding: '4px 10px', borderRadius: '6px' }}>
                          {m.isRead ? "Non lu" : "Lu"}
                        </button>
                      </form>
                      <form action={deleteMessageAction} style={{ margin: 0 }}>
                        <input type="hidden" name="id" value={m.id} />
                        <ConfirmButton message="Supprimer définitivement ce message ?">
                          <span style={{ color: '#ef4444' }}>×</span>
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
