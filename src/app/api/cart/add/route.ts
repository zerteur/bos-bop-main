import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { readCart, cartCookieHeader } from "@/lib/cart";
import { isShopEnabled } from "@/lib/settings";
import { seeOther } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await isShopEnabled())) {
    return seeOther("/");
  }
  const form = await request.formData();
  const productId = Number(form.get("productId"));
  const quantity = Math.min(Math.max(Math.floor(Number(form.get("quantity")) || 1), 1), 99);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  const cart = readCart(request);
  if (product && product.published && product.stock > 0) {
    cart[String(product.id)] = Math.min((cart[String(product.id)] ?? 0) + quantity, 99);
  }

  return seeOther("/panier", { "Set-Cookie": cartCookieHeader(cart) });
}
