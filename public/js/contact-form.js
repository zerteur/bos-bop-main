/**
 * Formulaire de contact : validation native + envoi en AJAX + anti-spam.
 *
 * Le formulaire d'origine (balisage Joomla « Uniform », conservé à l'identique
 * pour la fidélité visuelle) poste normalement au travers d'un mécanisme
 * historique posé par assets/js/…_form.js : une IFRAME cachée qui reçoit la
 * réponse, dans laquelle le script va chercher des champs cachés spécifiques
 * (message/error/redirect) générés par le backend Joomla d'origine — backend
 * qui n'existe plus ici. Résultat : le clic semblait ne rien faire (aucun
 * message affiché), qu'un message soit réellement envoyé ou non.
 *
 * On intercepte donc la soumission AVANT que ce script d'origine ne s'en
 * empare, pour :
 *   - valider nativement les champs obligatoires (HTML5, sans dépendre du JS
 *     de validation d'origine) ;
 *   - envoyer les données par fetch() vers /api/contact et rester sur la
 *     page (pas de rechargement, pas d'iframe) ;
 *   - vider le formulaire et afficher le message de confirmation au succès,
 *     ou un message d'erreur (reCAPTCHA non validé) sans perdre la saisie.
 *
 * Interception : le script d'origine n'attend pas seulement l'évènement
 * "submit" du <form> — le bouton ENVOYER a son propre gestionnaire de CLIC
 * (posé directement dessus par assets/js/..._form.js), qui appelle
 * `form.submit()` lui-même puis bloque le comportement par défaut du clic.
 * Un simple écouteur "submit" arrive donc trop tard : `form.submit()` (la
 * méthode native, pas l'évènement) ne redéclenche PAS l'évènement "submit"
 * (comportement du DOM), donc aucun écouteur "submit" — ni le nôtre, ni celui
 * d'origine — ne le voit passer. On intercepte à la place le CLIC lui-même,
 * en PHASE DE CAPTURE sur `document` : elle s'exécute avant tout écouteur
 * posé directement sur le bouton (comme celui du script d'origine, qui
 * écoute en phase de bulle), donc avant que `form.submit()` soit appelé — on
 * peut stopper la propagation avant, sans jamais modifier le fichier
 * d'origine ni la fidélité de la page. Un écouteur "submit" de secours (même
 * technique) couvre par ailleurs la validation au clavier (touche Entrée
 * dans un champ), qui déclenche directement l'évènement "submit" sans passer
 * par le bouton.
 *
 * Filet de sécurité : si l'envoi par fetch échoue (réseau, réponse
 * inattendue), on retombe sur un envoi de formulaire classique
 * (rechargement de page) — jamais de message perdu. Ce cas est déjà pris en
 * charge côté serveur (voir src/app/[...slug]/route.ts, paramètres
 * ?sent=1 / ?erreur=recaptcha).
 *
 * Injecté en fin de document (SAFETY_SCRIPTS dans render.ts) : n'affecte
 * jamais le HTML vérifié à l'octet par extract-legacy.mjs.
 */
(function () {
  "use strict";

  var FORM_SELECTOR = 'form[action="/api/contact"]';
  var HONEYPOT_NAME = "bd_site_web";

  // Textes identiques à ceux utilisés côté serveur pour le circuit sans
  // JavaScript (voir CONTACT_SUCCESS_HTML / CONTACT_RECAPTCHA_ERROR_HTML dans
  // src/app/[...slug]/route.ts) : même rendu, que le message vienne d'un
  // rechargement de page ou de cet envoi en AJAX.
  var SUCCESS_HTML =
    "<p><b>Votre message</b><b> </b><b>a bien</b><b> </b><b>été envoyé.</b></p>";
  var RECAPTCHA_ERROR_HTML =
    '<p style="color:#c0392b;"><b>La vérification anti-robot n\'a pas abouti.</b> Merci de cocher la case «&nbsp;Je ne suis pas un robot&nbsp;», puis de renvoyer votre message.</p>';
  var GENERIC_ERROR_HTML =
    '<p style="color:#c0392b;"><b>L\'envoi a échoué.</b> Merci de réessayer dans un instant.</p>';

  function addHoneypot(form) {
    if (form.querySelector('[name="' + HONEYPOT_NAME + '"]')) return;
    var field = document.createElement("input");
    field.type = "text";
    field.name = HONEYPOT_NAME;
    field.autocomplete = "off";
    field.tabIndex = -1;
    field.setAttribute("aria-hidden", "true");
    // Invisible pour un humain (et ignoré des lecteurs d'écran), mais présent
    // dans le DOM comme n'importe quel champ : les robots qui remplissent
    // aveuglément tous les champs le renseignent, un visiteur ne le voit jamais.
    field.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;";
    form.appendChild(field);
  }

  // Champs réellement exigés par le formulaire d'origine (classes posées par
  // le composant Joomla Uniform : item-blank-required, email-required,
  // dropdown-required, blank-required, checkbox-required — le simple astérisque
  // visuel <span class="required"> est parfois affiché sans validation
  // associée, ex. le téléphone). Reproduits en natif (attribut HTML5
  // `required`) pour profiter de la validation intégrée du navigateur sans
  // dépendre du script de validation d'origine.
  function applyRequiredMarkers(form) {
    form.querySelectorAll(".item-blank-required, .email-required").forEach(function (el) {
      el.required = true;
      if (el.classList.contains("email-required")) el.type = "email";
    });
    form
      .querySelectorAll(
        ".controls.dropdown-required select, .controls.blank-required input, .controls.blank-required textarea, .controls.blank-required select",
      )
      .forEach(function (el) {
        el.required = true;
      });
    form.querySelectorAll(".checkbox-required input[type=checkbox]").forEach(function (el) {
      el.required = true;
    });
  }

  function showMessage(form, html) {
    var div = form.querySelector(".message-uniform");
    if (!div) return;
    div.innerHTML = html;
    div.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resetRecaptcha(form) {
    var widget = form.querySelector(".g-recaptcha");
    if (widget && window.grecaptcha && typeof window.grecaptcha.reset === "function") {
      try {
        window.grecaptcha.reset();
      } catch (e) {
        // Widget pas encore initialisé par le script Google : rien à faire.
      }
    }
  }

  function submitForm(form) {
    var data = new FormData(form);
    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    return fetch(form.getAttribute("action"), {
      method: "POST",
      body: data,
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (result) {
        if (result && result.ok) {
          form.reset();
          resetRecaptcha(form);
          showMessage(form, SUCCESS_HTML);
        } else if (result && result.error === "recaptcha") {
          resetRecaptcha(form);
          showMessage(form, RECAPTCHA_ERROR_HTML);
        } else {
          showMessage(form, GENERIC_ERROR_HTML);
        }
      })
      .catch(function () {
        // Réseau indisponible, réponse invalide… : on ne perd jamais le
        // message, on retombe sur un envoi classique (voir en-tête de fichier).
        // form.submit() ne redéclenche pas l'évènement "submit" (comportement
        // natif du DOM) : ni notre écouteur ni celui d'origine ne se
        // relancent, aucune boucle possible.
        form.submit();
      })
      .then(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
  }

  // Empêche une double soumission si, par un enchaînement improbable
  // d'évènements, le clic ET le "submit" natif se déclenchaient tous les deux
  // pour la même action.
  function handleSubmission(form) {
    if (form.__bosbopSubmitting) return;
    if (typeof form.reportValidity === "function" && !form.reportValidity()) {
      // Champ obligatoire manquant/invalide : le navigateur affiche son
      // message natif, on n'envoie rien.
      return;
    }
    form.__bosbopSubmitting = true;
    submitForm(form).then(function () {
      form.__bosbopSubmitting = false;
    });
  }

  // Intercepte le CLIC sur le bouton ENVOYER avant que le gestionnaire
  // d'origine (posé directement dessus par assets/js/..._form.js, en phase
  // de bulle) ne s'en empare — voir l'explication en tête de fichier.
  function onClickCapture(event) {
    var btn = event.target.closest && event.target.closest('button[type="submit"]');
    if (!btn) return;
    var form = btn.closest(FORM_SELECTOR);
    if (!form) return;

    event.preventDefault();
    event.stopPropagation();
    handleSubmission(form);
  }

  // Filet de sécurité : soumission déclenchée autrement qu'en cliquant sur le
  // bouton (touche Entrée dans un champ texte), qui déclenche directement
  // l'évènement "submit" du <form> sans passer par le bouton.
  function onSubmitCapture(event) {
    var form = event.target;
    if (!form || form.tagName !== "FORM" || !form.matches(FORM_SELECTOR)) return;

    event.preventDefault();
    event.stopPropagation();
    handleSubmission(form);
  }

  function init() {
    document.querySelectorAll(FORM_SELECTOR).forEach(function (form) {
      addHoneypot(form);
      applyRequiredMarkers(form);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Phase de capture (3ᵉ argument `true`) : voir l'explication en tête de
  // fichier — condition à la bonne interception du script d'origine.
  document.addEventListener("click", onClickCapture, true);
  document.addEventListener("submit", onSubmitCapture, true);
})();
