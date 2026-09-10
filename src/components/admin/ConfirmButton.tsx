"use client";

import type { ReactNode } from "react";

/** Bouton de soumission avec confirmation (suppressions, etc.). */
export function ConfirmButton({
  children,
  message = "Confirmer la suppression ?",
  className = "btn danger petit",
}: {
  children: ReactNode;
  message?: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
