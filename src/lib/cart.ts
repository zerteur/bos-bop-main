import type { NextRequest } from "next/server";

// Panier stocké dans un cookie : simple JSON { [productId]: quantité }.
// Le contenu est revalidé côté serveur (produits publiés, prix) à chaque lecture.

export const CART_COOKIE = "bosbop_panier";

export type Cart = Record<string, number>;

export function parseCart(raw: string | undefined): Cart {
  if (!raw) return {};
  try {
    const data = JSON.parse(raw);
    const cart: Cart = {};
    for (const [id, qty] of Object.entries(data)) {
      const q = Math.floor(Number(qty));
      if (Number.isInteger(Number(id)) && q > 0 && q <= 99) cart[id] = q;
    }
    return cart;
  } catch {
    return {};
  }
}

export function readCart(request: NextRequest): Cart {
  return parseCart(request.cookies.get(CART_COOKIE)?.value);
}

export function cartCookieHeader(cart: Cart): string {
  const value = encodeURIComponent(JSON.stringify(cart));
  return `${CART_COOKIE}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

export function clearCartCookieHeader(): string {
  return `${CART_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function cartCount(cart: Cart): number {
  return Object.values(cart).reduce((sum, q) => sum + q, 0);
}
