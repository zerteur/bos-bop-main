"use client";

import { useState } from "react";
import { addCustomerAction, deleteCustomerAction, sendNewsletterAction } from "@/lib/actions/crm";
import { formatDate } from "@/lib/format";
import RichTextEditor from "@/components/admin/RichTextEditor";

export function CrmClientWrapper({ customers, history = [] }: { customers: any[], history?: any[] }) {
  const [tab, setTab] = useState<"list" | "newsletter" | "add">("list");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [content, setContent] = useState("");

  const handleSendNewsletter = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!window.confirm("Voulez-vous vraiment envoyer cet e-mail à tous vos contacts inscrits ?")) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await sendNewsletterAction(new FormData(form));
      setSuccess("Newsletter envoyée avec succès !");
      form.reset();
      setContent("");
    } catch (err: any) {
      setError(err.message || "Erreur d'envoi");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await addCustomerAction(new FormData(form));
      setSuccess("Client ajouté/modifié avec succès !");
      form.reset();
      setTab("list");
    } catch (err: any) {
      setError(err.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="tabs-row">
        <button className={`btn ${tab === "list" ? "principal" : "secondaire"}`} onClick={() => setTab("list")}>Liste des clients</button>
        <button className={`btn ${tab === "add" ? "principal" : "secondaire"}`} onClick={() => setTab("add")}>Ajouter un contact</button>
        <button className={`btn ${tab === "newsletter" ? "principal" : "secondaire"}`} onClick={() => setTab("newsletter")}>Envoyer une Newsletter</button>
      </div>

      {error && <div className="notice erreur">{error}</div>}
      {success && <div className="notice ok">{success}</div>}

      {tab === "list" && (
        <div className="panel" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
          <h2 style={{ fontSize: '18px', color: '#1f2430', marginBottom: '20px' }}>👥 Vos Contacts</h2>
          <table className="liste" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#666', fontWeight: 600 }}>Email</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#666', fontWeight: 600 }}>Nom</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#666', fontWeight: 600 }}>Téléphone</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: '#666', fontWeight: 600 }}>Newsletter</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#666', fontWeight: 600 }}>Date d'ajout</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', color: '#666', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 600, color: '#1f2430' }}>{c.email}</td>
                  <td style={{ padding: '10px 8px' }}>{c.name || <span style={{ color: '#ccc' }}>—</span>}</td>
                  <td style={{ padding: '10px 8px' }}>{c.phone || <span style={{ color: '#ccc' }}>—</span>}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    {c.optIn ? <span className="badge vert" style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', textTransform: 'uppercase' }}>Inscrit</span> : <span className="badge gris" style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', textTransform: 'uppercase' }}>Désinscrit</span>}
                  </td>
                  <td style={{ padding: '10px 8px', color: '#888' }}>{formatDate(c.createdAt)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    <button 
                      className="btn petit" 
                      style={{ background: "#ef4444", color: "#fff", border: "none", padding: '4px 10px', borderRadius: '6px' }}
                      onClick={async () => {
                        if (window.confirm("Supprimer ce client ?")) {
                          await deleteCustomerAction(c.id);
                        }
                      }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "add" && (
        <div className="panel" style={{ maxWidth: "600px" }}>
          <h2>Ajouter un contact manuel</h2>
          <form onSubmit={handleAddCustomer}>
            <label className="champ">
              Adresse e-mail
              <input type="email" name="email" required />
            </label>
            <label className="champ">
              Nom complet (Optionnel)
              <input type="text" name="name" />
            </label>
            <label className="champ">
              Téléphone (Optionnel)
              <input type="text" name="phone" />
            </label>
            <label className="champ-inline" style={{ marginBottom: "20px" }}>
              <input type="checkbox" name="optIn" value="1" defaultChecked />
              Inscrire à la newsletter
            </label>
            <button type="submit" className="btn principal" disabled={loading}>
              {loading ? "Ajout en cours..." : "Ajouter le client"}
            </button>
          </form>
        </div>
      )}

      {tab === "newsletter" && (
        <div className="panel">
          <h2>Rédiger une Newsletter</h2>
          <p className="aide" style={{ marginBottom: "20px" }}>
            Envoyé individuellement à chaque contact inscrit, avec le même gabarit que les e-mails de commande
            (logo, avatar, signature, pixel de suivi). Un lien de désinscription est ajouté automatiquement.
          </p>
          <form onSubmit={handleSendNewsletter}>
            <label className="champ">
              Objet de l'e-mail
              <input type="text" name="subject" required placeholder="Ex: Sortie de mon nouveau livre !" />
            </label>
            <label className="champ">
              Contenu du message
              
              <input type="hidden" name="content" value={content} />
              <RichTextEditor value={content} onChange={setContent} />
  
            </label>

            <button type="submit" className="btn principal" disabled={loading} style={{ background: "#ddc076", color: "#1f2430" }}>
              {loading ? "Envoi en cours..." : "Envoyer la Newsletter"}
            </button>
          </form>

          {history.length > 0 && (
            <div style={{ marginTop: "40px", paddingTop: "30px", borderTop: "1px solid #e3e6ee" }}>
              <h3 style={{ marginBottom: "20px", color: "#1f2430", fontSize: '18px' }}>📜 Historique des envois</h3>
              <div className="panel" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
                <table className="liste" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                      <th style={{ padding: '10px 8px', textAlign: 'left', color: '#666', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', color: '#666', fontWeight: 600 }}>Objet</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', color: '#666', fontWeight: 600 }}>Destinataires</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', color: '#666', fontWeight: 600 }}>Ouvertures</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h: any) => (
                      <tr key={h.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                        <td style={{ padding: '10px 8px', color: '#888' }}>{new Date(h.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                        <td style={{ padding: '10px 8px', fontWeight: 500 }}>{h.subject}</td>
                        <td style={{ padding: '10px 8px', textAlign: "right" }}>{h.recipientsCount}</td>
                        <td style={{ padding: '10px 8px', textAlign: "right" }}>
                          <span className="badge vert" style={{ padding: '4px 10px', borderRadius: '12px', background: '#dcfce7', color: '#166534' }}>{h.opens}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
