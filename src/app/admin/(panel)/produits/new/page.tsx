import { ProductForm } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default function NewProductPage() {
  return (
    <>
      <h1>Ajouter un livre</h1>
      <p className="subtitle">Créez la fiche du livre ; cochez « Visible dans la boutique » quand elle est prête.</p>
      <ProductForm product={null} />
    </>
  );
}
