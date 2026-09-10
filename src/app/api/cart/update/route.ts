import { NextRequest } from "next/server";
import { readCart, cartCookieHeader } from "@/lib/cart";
import { seeOther } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const productId = String(Number(form.get("productId")));
  const quantity = Math.min(Math.max(Math.floor(Number(form.get("quantity")) || 0), 0), 99);

  const cart = readCart(request);
  if (quantity === 0) {
    delete cart[productId];
  } else if (cart[productId] !== undefined) {
    cart[productId] = quantity;
  }

  return seeOther("/panier", { "Set-Cookie": cartCookieHeader(cart) });
}
