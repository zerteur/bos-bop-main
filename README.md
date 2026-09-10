# BOS & BOP — www.bos-bop.fr

Migration du site Joomla 3 vers une application web moderne, **visuellement
identique à l'original**, avec panneau d'administration, générateur de pages
et prémisses e-commerce pour la vente des livres.

## En bref

| | |
|---|---|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) + React 19 + TypeScript |
| Base de données | SQLite via [Prisma](https://www.prisma.io/) (fichier unique, sauvegarde = copie) |
| Authentification | Session JWT (cookie httpOnly), mots de passe hachés bcrypt |
| Rendu public | HTML historique reproduit **à l'octet près** à partir de gabarits extraits du dump Joomla |
| Administration | `/admin` — pages, menu, messages, livres, commandes, réglages |

## Fidélité visuelle : comment c'est garanti

Le site public n'est **pas** une réécriture du design : chaque page est
assemblée à partir des gabarits HTML/CSS/JS d'origine (dossier `templates/`
et `content/`), extraits mécaniquement du dump Joomla (`legacy/`) par
`scripts/extract-legacy.mjs`. Ce script **vérifie octet par octet** que le
ré-assemblage reproduit les pages d'origine :

```
npm run extract:legacy
# ✔ index.html : identique (46090 octets)
# ✔ bilan-…    : identique (44848 octets)
# … (6 pages sur 6)
```

Seuls sont neutralisés des artefacts injectés par JavaScript au moment de la
capture du dump (widget Facebook, badge reCAPTCHA, menu déroulant select2 —
ils sont régénérés au chargement, comme sur le site d'origine). Une
comparaison de captures d'écran ancien/nouveau donne **0,00 % de pixels
différents** sur toutes les pages.

Les feuilles de style, scripts et images du template Joomla `juillet2019`
sont servis tels quels depuis `public/assets/`.

## Démarrage

```bash
cp .env.example .env      # puis éditer SESSION_SECRET, ADMIN_PASSWORD…
npm install
npx prisma db push        # crée la base SQLite
npm run db:seed           # importe les pages du site + compte admin
npm run dev               # http://localhost:3000
```

Compte administrateur par défaut (défini dans `.env` **avant** le seed) :
`admin@bos-bop.fr` / `admin` — **à changer immédiatement** (Réglages → Mot de
passe).

### Production

Premier déploiement :

```bash
npm install
npm run deploy             # prisma generate + db push + seed + build
pm2 start npm --name bos-bop -- start
```

À prévoir sur le serveur :

- `SESSION_SECRET` : longue chaîne aléatoire (`openssl rand -hex 32`) ;
- persistance de `prisma/*.db` (la base) et `public/uploads/` (images
  téléversées) — sur un VPS classique c'est automatique, sur un hébergeur
  « serverless » il faudrait déplacer ces deux éléments ;
- reprise du favicon : la balise d'origine pointe vers
  `https://www.bos-bop.fr/templates/juillet2019/images/designer/…Fichier1.png` ;
  copier ce fichier du site actuel avant la bascule DNS (même chemin) ou
  adapter la balise dans `content/heads/*.html` puis relancer le seed ;
- si le site est servi derrière un reverse proxy (Nginx, Apache…) : penser à
  relever sa limite de taille de requête (`client_max_body_size` sous Nginx,
  1 Mo par défaut) au moins au niveau de `MAX_SIZE` dans
  `src/app/api/admin/upload/route.ts` (25 Mo), sans quoi le téléversement
  d'images (bannière, produits, pages) échoue silencieusement côté proxy
  avant même d'atteindre l'application.

### Mise à jour du site (nouveau code, nouvelles pages)

```bash
git pull
npm install
npm run deploy              # crée les pages/menus manquants, ne touche jamais au reste
pm2 restart bos-bop --update-env
```

`npm run deploy` (donc `npm run db:seed`) est **sans risque à relancer à
chaque mise à jour** : par défaut il ne fait que créer les pages ou entrées de
menu qui n'existent pas encore (ex. une page ajoutée dans `content/`) et ne
touche jamais au contenu déjà présent — vos modifications faites depuis
l'administration sont donc toujours préservées.

**Ne jamais supprimer `prisma/*.db`** pour « forcer » une mise à jour : c'est
la base de production (pages, messages, commandes, comptes…), pas un cache.
La supprimer réinitialise entièrement le site (d'où le « page non trouvée »
généralisé si le seed n'est pas relancé juste après). Si vous voulez
explicitement resynchroniser le contenu des 6 pages migrées depuis le dépôt
(par exemple après une correction de mise en forme) :

```bash
RESEED_LEGACY_CONTENT=1 npm run db:seed
```

Les correctifs purement visuels (icônes, styles) ne nécessitent eux aucune
étape de seed : ils sont injectés au rendu et s'appliquent automatiquement
dès que le nouveau code est déployé.

### Reprise du référencement

Les URL historiques sont conservées (`/bilan-orientation-scolaire-professionnel-toulouse`,
etc.) et les anciennes variantes Joomla (`….html`, `index.php`, `page.html`)
sont redirigées en 301 — voir `next.config.ts`.

## Administration (`/admin`)

- **Pages** : modification des pages existantes (SEO + contenu), création de
  nouvelles pages avec l'habillage complet du site — voir le *constructeur
  visuel* ci-dessous.
- **Bannière d'accueil** : titre et image de fond du grand bandeau.
- **Menu du site** : ordre, libellés, ajout d'entrées (pages ou URL libres).
- **Messages** : le formulaire de contact d'origine enregistre désormais les
  demandes en base (plus de dépendance au composant Joomla) ; consultation,
  lu/non-lu, réponse par email en un clic.
- **Livres** : catalogue (titre, auteur, prix, stock, couverture, description).
- **Commandes** : suivi (Nouvelle → Confirmée → Expédiée / Annulée).
- **Réglages** : URL publique, activation de la boutique, mot de passe.

## Studio d'édition visuel (« à la Wix »)

Créer ou modifier une page ouvre un **studio plein écran** (route
`/admin/studio/[id]`), un espace de création immersif — sans l'habillage de
l'administration. On y **modifie directement le rendu réel du site** :

- **Édition directe sur la page** : cliquez sur un titre, un paragraphe, un
  libellé de bouton dans l'aperçu et tapez — le texte se modifie sur place. Le
  rendu affiché est exactement celui qui sera publié (même moteur de rendu).
- **Sélection de bloc** : cliquer un bloc l'entoure et fait apparaître une
  barre d'outils flottante (monter, descendre, dupliquer, réglages, supprimer)
  ainsi qu'un **inspecteur** à droite pour toutes ses options (image,
  alignement, nombre de colonnes, liens de bouton, cartes…).
- **Insertion** : des pastilles « + » entre les blocs ouvrent une palette pour
  insérer un nouveau bloc à l'endroit voulu.
- **Aperçu appareil** : bascule ordinateur / mobile. Enregistrement sans
  quitter le studio (bouton Enregistrer ou Ctrl/Cmd+S), interrupteur
  Publié/Brouillon, et tiroir « Paramètres » (nom, adresse, SEO).
- **Blocs disponibles** : bannière (hero), titre + texte, appel à l'action,
  bouton, image, image + texte, colonnes (2/3/4), cartes colorées (style
  « méthode 360° »), espacement, séparateur, HTML avancé. Chaque bloc est
  compilé vers le balisage du template d'origine (mêmes polices, couleurs,
  cartes, boutons).
- **Modèles de démarrage** : à la création, choisissez un modèle (Page vierge,
  Présentation, Prestation, Page d'atterrissage) pré-rempli de blocs.
- **Édition des pages existantes** : chaque page du site d'origine peut être
  ouverte dans le studio (« Ouvrir dans le studio visuel »). Son contenu
  historique est **préservé à l'identique** dans un bloc « HTML avancé » — le
  rendu publié ne change pas tant que rien n'est modifié — et l'on peut ajouter
  des blocs autour.

Techniquement : les blocs sont stockés en JSON (`Page.blocksJson`) et compilés
côté serveur (`src/lib/blocks.ts`). L'aperçu/édition passe par
`POST /api/admin/preview` (le mode éditeur ajoute les annotations
`data-bd-block` / `contenteditable` et injecte `src/lib/editor-script.ts` dans
l'iframe) ; la sauvegarde se fait via `PUT /api/admin/pages/[id]`. Les
annotations n'existent qu'en édition : le HTML publié en est totalement exempt.

## Boutique (e-commerce)

Désactivée par défaut : le site reste alors strictement identique à
l'original. Une fois activée (Réglages) :

- `/livres` : catalogue des ouvrages publiés, `/livres/{slug}` : fiche ;
- `/panier` puis `/commande` : panier (cookie) et prise de commande ;
- pensez à ajouter une entrée « Les livres » → `/livres` dans le menu.

**Paiement.** Sans Stripe configuré, une commande validée est simplement
enregistrée (statut « Paiement manuel ») et vous convenez du règlement
directement avec le client — c'est le comportement par défaut, rien à faire
pour que la boutique fonctionne. Une fois Stripe connecté (ci-dessous), le
client est automatiquement redirigé vers une page de paiement par carte
sécurisée ; la commande passe en « Payée » dès la confirmation par Stripe, et
le stock n'est décompté qu'à ce moment-là (jamais sur un panier abandonné
avant paiement).

### Connecter Stripe

Tout se fait depuis **Réglages → Paiement en ligne**, aucun accès au serveur
n'est nécessaire.

1. **Créer un compte Stripe** (si ce n'est pas déjà fait) sur
   [dashboard.stripe.com](https://dashboard.stripe.com/register).

2. **Récupérer la clé secrète** : dans le tableau de bord Stripe,
   *Développeurs → Clés API* → copier la « Clé secrète » (`sk_test_...` en
   mode test, `sk_live_...` en mode production — commencez par le mode test,
   basculable via le bouton en haut à droite du tableau de bord). La coller
   dans Réglages → Paiement en ligne, champ « Clé secrète Stripe », puis
   Enregistrer.

3. **Créer le webhook** : *Développeurs → Webhooks → Ajouter un endpoint*.
   - Adresse à renseigner : copiez celle affichée dans Réglages → Paiement
     en ligne (`.../api/stripe/webhook`) ;
   - Évènements à écouter : `checkout.session.completed`,
     `checkout.session.async_payment_succeeded`,
     `checkout.session.expired`, `checkout.session.async_payment_failed` ;
   - Une fois créé, Stripe affiche un « Secret de signature »
     (`whsec_...`) : le coller dans le champ « Secret de signature du
     webhook » de la même page, puis Enregistrer.

4. **Vérifier** : Réglages → Paiement en ligne doit afficher « Configurée »
   pour les deux lignes. Passez une commande de test sur `/livres` avec une
   [carte de test Stripe](https://docs.stripe.com/testing#cards) (ex.
   `4242 4242 4242 4242`, n'importe quelle date future, n'importe quel CVC) :
   la commande doit apparaître « Payée » dans Commandes après quelques
   secondes.

5. **Passer en production** quand vous êtes prêt : dans le tableau de bord
   Stripe, basculez en mode production (bouton en haut à droite), récupérez
   la clé secrète et recréez un webhook *en mode production* (les clés et
   webhooks de test et de production sont distincts) ; remplacez les deux
   valeurs dans Réglages → Paiement en ligne par leurs équivalents
   `sk_live_...` / `whsec_...`.

**Retirer les clés enregistrées** : bouton dédié en bas du même formulaire
(désactive le paiement en ligne, la boutique repasse en circuit manuel).

**Alternative pour un déploiement entièrement piloté par fichiers de
configuration** (CI/CD, infrastructure as code…) : les variables
d'environnement `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` (voir
`.env.example`) restent prises en charge et sont prioritaires sur les
réglages enregistrés depuis le tableau de bord — dans ce cas les champs du
formulaire ci-dessus sont désactivés (la page l'indique).

## Anti-spam du formulaire de contact

Le formulaire est protégé, sans configuration, par deux mécanismes maison
sans dépendance externe : un **champ piège (honeypot)** invisible pour un
humain mais rempli par la plupart des robots, et une **limite de fréquence
par IP** (5 envois par 10 minutes). Une soumission suspecte reçoit la même
confirmation qu'un envoi normal, mais n'est pas enregistrée.

### Connecter reCAPTCHA

Le reCAPTCHA *invisible* d'origine du template dépendait d'une clé verrouillée
sur l'ancien domaine (`www.bos-bop.fr`) et d'un chargeur périmé : il affichait
un badge cassé et ne vérifiait plus rien. Il est désormais retiré, et
remplaçable par une **case reCAPTCHA v2 « Je ne suis pas un robot »** en
option. Tout se règle depuis **Réglages → Protection anti-robot**, sans accès
au serveur.

1. **Créer un site reCAPTCHA** sur
   [google.com/recaptcha/admin](https://www.google.com/recaptcha/admin/create).
   - Type : **reCAPTCHA v2** → **« Je ne suis pas un robot » Case à cocher** ;
   - Domaines : ajoutez le domaine où le site est servi (par exemple
     `bos-bop.lp-folio.fr`, puis `www.bos-bop.fr` le jour de la bascule).
2. **Copier les deux clés** fournies par Google (clé de site, publique ; clé
   secrète, privée) dans Réglages → Protection anti-robot, puis Enregistrer.
3. **Vérifier** : la page de contact affiche alors la case reCAPTCHA au-dessus
   du bouton « Envoyer ». Un envoi sans cocher la case est refusé avec un
   message invitant à réessayer ; une fois cochée, le message part
   normalement.

Le champ piège et la limite de fréquence restent actifs en plus, en défense en
profondeur. Si Google est momentanément injoignable, l'envoi n'est pas bloqué
(on accorde le bénéfice du doute, ces deux protections continuant de
s'appliquer). **Retirer les clés** : bouton dédié en bas du même formulaire (le
formulaire repasse à la protection honeypot + limite de fréquence seule).

Les variables d'environnement `RECAPTCHA_SITE_KEY` et `RECAPTCHA_SECRET_KEY`
sont également prises en charge et prioritaires sur les réglages du tableau de
bord (mêmes conventions que Stripe).

## Structure du dépôt

```
legacy/            dump du site Joomla d'origine (référence, non servi)
templates/         gabarits communs extraits (header, footer, <head>…)
content/           contenu par page extrait : HTML, blocs, menu (seed)
scripts/           extract-legacy.mjs (vérification octet) + decompose-legacy.mjs
prisma/            schéma, seed, base SQLite
public/assets/     CSS/JS/images du template Joomla, servis à l'identique
                   (cache HTTP immuable : noms préfixés par un hash de contenu)
public/js/         scripts propres au nouveau site (scroll-manager.js)
public/uploads/    fichiers téléversés depuis l'administration
src/app/           routes : pages publiques (route handlers), /admin, /api
src/lib/           rendu, blocs, panier, auth, constantes partagées
src/lib/actions/   actions d'administration, un module par domaine
src/components/    composants React de l'administration
```

## Notes techniques

- Les pages publiques sont servies par des *route handlers* qui renvoient le
  HTML assemblé tel quel : aucune hydratation React côté public, donc aucun
  risque de divergence visuelle.
- Deux scripts Google Analytics du dump n'étaient pas archivés ; des stubs
  vides les remplacent (`public/assets/js/44da…_js.js`, `9673…_js.js`).
  L'identifiant `UA-143935594-1` (Universal Analytics) est de toute façon
  obsolète — prévoir une migration GA4 si le suivi est souhaité.
- **Anti-spam du formulaire de contact** : honeypot + limite de fréquence par
  IP toujours actifs, et case reCAPTCHA v2 vérifiée côté serveur si des clés
  sont configurées (voir la section « Anti-spam du formulaire de contact » plus
  haut, `src/lib/recaptcha.ts` et `src/app/api/contact/route.ts`). Le reCAPTCHA
  invisible cassé d'origine est retiré du rendu.
- **Défilement** : le template d'origine fige la page (`position:fixed` sur
  `<html>`) pendant l'ouverture du menu mobile et ne la libère qu'en fin
  d'animation. `public/js/scroll-manager.js` libère le défilement dès le début
  de la fermeture et surveille les états bloqués par MutationObserver
  (aucune boucle de scrutation). Le comportement visible est inchangé.
- **Cache HTTP** : les fichiers de `public/assets/` (noms hashés) et
  `public/uploads/` (noms horodatés) sont servis avec
  `Cache-Control: immutable` (voir `next.config.ts`).
