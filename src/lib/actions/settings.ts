"use server";

// Actions sur les réglages du site et la bannière d'accueil.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../auth";
import { setSetting } from "../settings";
import { formString as str } from "../forms";

export async function saveSettingsAction(formData: FormData) {
  await requireSession();
  const siteUrl = str(formData, "siteUrl", 300).replace(/\/+$/, "");
  if (siteUrl) await setSetting("siteUrl", siteUrl);
  await setSetting("shopEnabled", formData.get("shopEnabled") === "1" ? "1" : "0");
  revalidatePath("/admin/parametres");
  redirect("/admin/parametres?ok=1");
}

export async function saveHeroAction(formData: FormData) {
  await requireSession();
  await setSetting("heroTitle", str(formData, "heroTitle", 500));
  await setSetting("heroImageUrl", str(formData, "heroImageUrl", 500));
  revalidatePath("/admin/accueil");
  revalidatePath("/");
  redirect("/admin/accueil?ok=1");
}

export async function saveWidgetsAction(formData: FormData) {
  await requireSession();
  await setSetting("widgetPhone", str(formData, "widgetPhone", 30));
  await setSetting("widgetFacebookUrl", str(formData, "widgetFacebookUrl", 300));
  await setSetting("widgetLinkedinUrl", str(formData, "widgetLinkedinUrl", 300));
  await setSetting("widgetShareBarEnabled", formData.get("widgetShareBarEnabled") === "1" ? "1" : "0");
  await setSetting("widgetShareFacebookUrl", str(formData, "widgetShareFacebookUrl", 300));
  await setSetting("widgetShareTwitterUrl", str(formData, "widgetShareTwitterUrl", 300));
  await setSetting("widgetShareLinkedinUrl", str(formData, "widgetShareLinkedinUrl", 300));
  revalidatePath("/admin/widgets");
  revalidatePath("/", "layout");
  redirect("/admin/widgets?ok=1");
}

// reCAPTCHA : la clé de SITE est publique (visible dans le HTML), on la traite
// comme un champ normal (on peut la pré-remplir, la vider l'efface). La clé
// SECRÈTE suit la même règle prudente que Stripe : un champ vide ne l'écrase
// pas ; « Retirer » efface explicitement les deux.
export async function saveRecaptchaSettingsAction(formData: FormData) {
  await requireSession();
  if (formData.get("retirer") === "1") {
    await setSetting("recaptchaSiteKey", "");
    await setSetting("recaptchaSecretKey", "");
  } else {
    await setSetting("recaptchaSiteKey", str(formData, "recaptchaSiteKey", 300));
    const secret = str(formData, "recaptchaSecretKey", 300);
    if (secret) await setSetting("recaptchaSecretKey", secret);
  }
  revalidatePath("/admin/parametres");
  revalidatePath("/", "layout");
  redirect("/admin/parametres?ok=1");
}

// Clés Stripe : un champ laissé vide ne modifie pas la valeur déjà
// enregistrée (on n'écrase jamais une clé existante par erreur avec un
// formulaire soumis sans rien y avoir saisi). « Retirer les clés
// enregistrées » les efface explicitement.
export async function saveStripeSettingsAction(formData: FormData) {
  await requireSession();
  if (formData.get("retirer") === "1") {
    await setSetting("stripeSecretKey", "");
    await setSetting("stripeWebhookSecret", "");
  } else {
    const secretKey = str(formData, "stripeSecretKey", 300);
    if (secretKey) await setSetting("stripeSecretKey", secretKey);
    const webhookSecret = str(formData, "stripeWebhookSecret", 300);
    if (webhookSecret) await setSetting("stripeWebhookSecret", webhookSecret);
  }
  revalidatePath("/admin/parametres");
  redirect("/admin/parametres?ok=1");
}
