import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { deleteMessageAction } from "@/lib/admin-actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MessageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const message = await prisma.contactMessage.findUnique({ where: { id: Number(id) } });
  if (!message) notFound();

  // La consultation vaut lecture
  if (!message.isRead) {
    await prisma.contactMessage.update({ where: { id: message.id }, data: { isRead: true } });
  }

  return (
    <>
      <div className="entete-page">
        <h1>Message de {message.firstName} {message.lastName}</h1>
        <Link href="/admin/messages" className="btn secondaire">
          ← Tous les messages
        </Link>
      </div>

      <div className="panel">
        <table className="liste">
          <tbody>
            <tr><th>Reçu le</th><td>{formatDate(message.createdAt)}</td></tr>
            <tr><th>De</th><td>{message.civility} {message.firstName} {message.lastName}</td></tr>
            <tr><th>Vous êtes</th><td>{message.audience || "—"}</td></tr>
            <tr>
              <th>Email</th>
              <td>{message.email ? <a href={`mailto:${message.email}`}>{message.email}</a> : "—"}</td>
            </tr>
            <tr>
              <th>Téléphone</th>
              <td>{message.phone ? <a href={`tel:${message.phone}`}>{message.phone}</a> : "—"}</td>
            </tr>
            <tr><th>Sujet</th><td>{message.subject || "(sans sujet)"}</td></tr>
          </tbody>
        </table>
        <div style={{ whiteSpace: "pre-wrap", marginTop: 18 }}>{message.body}</div>
      </div>

      <div className="actions-ligne">
        {message.email && (
          <a
            className="btn principal"
            href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}
          >
            Répondre par email
          </a>
        )}
        <form action={deleteMessageAction}>
          <input type="hidden" name="id" value={message.id} />
          <ConfirmButton className="btn danger" message="Supprimer définitivement ce message ?">
            Supprimer
          </ConfirmButton>
        </form>
      </div>
    </>
  );
}
