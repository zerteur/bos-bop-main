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
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button className={`btn ${tab === "list" ? "principal" : "secondaire"}`} onClick={() => setTab("list")}>Liste des clients</button>
        <button className={`btn ${tab === "add" ? "principal" : "secondaire"}`} onClick={() => setTab("add")}>Ajouter un contact</button>
        <button className={`btn ${tab === "newsletter" ? "principal" : "secondaire"}`} onClick={() => setTab("newsletter")}>Envoyer une Newsletter</button>
      </div>

      {error && <div className="notice erreur">{error}</div>}
      {success && <div className="notice ok">{success}</div>}

      {tab === "list" && (
        <div className="panel">
          <h2>Vos Contacts</h2>
          <table className="liste">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nom</th>
                <th>Téléphone</th>
                <th>Newsletter</th>
                <th>Date d'ajout</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.email}</strong></td>
                  <td>{c.name || "-"}</td>
                  <td>{c.phone || "-"}</td>
                  <td>
                    {c.optIn ? <span className="badge vert">Inscrit</span> : <span className="badge gris">Désinscrit</span>}
                  </td>
                  <td>{formatDate(c.createdAt)}</td>
                  <td>
                    <button 
                      className="btn petit" 
                      style={{ background: "#c0392b", color: "#fff", border: "none" }}
                      onClick={async () => {
                        if (window.confirm("Supprimer ce client ?")) {
                          await deleteCustomerAction(c.id);
                        }
                      }}
                    >
                      X
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
          <p className="aide" style={{ marginBottom: "20px" }}>Cet e-mail sera envoyé en copie cachée (Cci) à tous les clients ayant le badge "Inscrit". Le design de l'e-mail (logo, couleurs) sera automatiquement appliqué.</p>
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
              <h3 style={{ marginBottom: "20px", color: "#1f2430" }}>Historique des envois</h3>
              <table className="liste">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Objet</th>
                    <th style={{ textAlign: "right" }}>Destinataires</th>
                    <th style={{ textAlign: "right" }}>Ouvertures</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h: any) => (
                    <tr key={h.id}>
                      <td style={{ color: "#6b7280" }}>{new Date(h.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                      <td style={{ fontWeight: 500 }}>{h.subject}</td>
                      <td style={{ textAlign: "right" }}>{h.recipientsCount}</td>
                      <td style={{ textAlign: "right" }}>
                        <span className="badge vert">{h.opens}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
