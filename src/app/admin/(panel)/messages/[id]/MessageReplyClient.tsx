"use client";

import { useState } from "react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { replyToMessageAction } from "@/lib/admin-actions";

export function MessageReplyClient({ message }: { message: any }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!content) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      fd.append("content", content);
      await replyToMessageAction(fd);
      setSuccess(true);
      setContent("");
    } catch (err: any) {
      setError(err.message || "Erreur d'envoi");
    } finally {
      setLoading(false);
    }
  };

  if (!message.email) return null;

  return (
    <div className="panel" style={{ marginTop: "20px" }}>
      <h2>Répondre depuis la plateforme</h2>
      {success && <div className="notice ok">Réponse envoyée avec succès !</div>}
      {error && <div className="notice erreur">{error}</div>}
      
      <form onSubmit={handleReply} style={{ marginTop: "15px" }}>
        <input type="hidden" name="id" value={message.id} />
        <label className="champ">
          Sujet de la réponse
          <input type="text" name="subject" defaultValue={`Re: ${message.subject || "Votre message"}`} required />
        </label>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: 600 }}>Message</label>
          <RichTextEditor value={content} onChange={setContent} />
        </div>
        <button type="submit" className="btn principal" disabled={loading} style={{ background: "#ddc076", color: "#1f2430" }}>
          {loading ? "Envoi en cours..." : "Envoyer la réponse"}
        </button>
      </form>
    </div>
  );
}
