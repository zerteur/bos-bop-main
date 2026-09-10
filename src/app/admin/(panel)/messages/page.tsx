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
      <h1>Messages reçus</h1>
      <p className="subtitle">
        Les messages envoyés depuis le formulaire de contact du site sont enregistrés ici.
      </p>

      {messages.length === 0 ? (
        <div className="panel">
          <p className="vide">Aucun message pour le moment.</p>
        </div>
      ) : (
        <table className="liste">
          <thead>
            <tr>
              <th>Date</th>
              <th>De</th>
              <th>Vous êtes</th>
              <th>Sujet</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m.id} className={m.isRead ? undefined : "non-lu"}>
                <td>{formatDate(m.createdAt)}</td>
                <td>
                  <Link href={`/admin/messages/${m.id}`}>
                    {m.civility} {m.firstName} {m.lastName}
                  </Link>
                </td>
                <td>{m.audience}</td>
                <td>
                  <Link href={`/admin/messages/${m.id}`}>{m.subject || "(sans sujet)"}</Link>
                </td>
                <td>
                  <div className="actions-ligne">
                    <form action={toggleMessageReadAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <button type="submit" className="btn secondaire petit">
                        {m.isRead ? "Marquer non lu" : "Marquer lu"}
                      </button>
                    </form>
                    <form action={deleteMessageAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <ConfirmButton message="Supprimer définitivement ce message ?">
                        Supprimer
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
