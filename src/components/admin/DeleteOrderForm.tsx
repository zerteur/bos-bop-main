"use client";

import { deleteOrderAction } from "@/lib/admin-actions";

export default function DeleteOrderForm({ id }: { id: number }) {
  return (
    <form 
      action={deleteOrderAction}
      onSubmit={(e) => {
        if (!window.confirm("Voulez-vous vraiment supprimer cette commande ? Cette action est irréversible.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn alerte petit">
        Supprimer cette commande
      </button>
    </form>
  );
}
