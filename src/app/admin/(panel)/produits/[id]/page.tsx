import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProductForm } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const { id } = await params;
  const { ok, erreur } = await searchParams;
  const product = await prisma.product.findUnique({ where: { id: Number(id) } });
  if (!product) notFound();

  return (
    <>
      <div className="entete-page">
        <h1>Modifier : {product.title}</h1>
        <a href={`/livres/${product.slug}`} target="_blank" rel="noreferrer" className="btn secondaire">
          Voir la fiche ↗
        </a>
      </div>
      {ok && <div className="notice ok">Fiche enregistrée.</div>}
      {erreur && <div className="notice erreur">Merci d&apos;indiquer un titre.</div>}
      <ProductForm product={product} />
    </>
  );
}
