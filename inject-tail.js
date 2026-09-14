const fs = require('fs');

function injectScripts() {
  const filePath = 'templates/tail.html';
  let html = fs.readFileSync(filePath, 'utf8');

  const cookieBanner = `
<div id="cookie-banner" style="position: fixed; bottom: 0; left: 0; right: 0; background: #1f2430; color: #fff; padding: 20px; z-index: 9999; display: none; text-align: center; box-shadow: 0 -4px 10px rgba(0,0,0,0.1);">
  <div style="max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 15px;">
    <p style="margin: 0; font-size: 14px;">Ce site utilise des cookies pour assurer son bon fonctionnement et mémoriser vos préférences de navigation. En continuant votre navigation, vous acceptez notre politique de confidentialité.</p>
    <div style="display: flex; gap: 10px;">
      <button id="accept-cookies" style="background: #ddc076; color: #1f2430; border: none; padding: 8px 24px; border-radius: 4px; font-weight: bold; cursor: pointer;">J'accepte</button>
      <button id="refuse-cookies" style="background: transparent; color: #fff; border: 1px solid #fff; padding: 8px 24px; border-radius: 4px; cursor: pointer;">Je refuse</button>
    </div>
  </div>
</div>
<script>
  if (!localStorage.getItem('cookieConsent')) {
    document.getElementById('cookie-banner').style.display = 'block';
  }
  document.getElementById('accept-cookies').addEventListener('click', () => {
    localStorage.setItem('cookieConsent', 'accepted');
    document.getElementById('cookie-banner').style.display = 'none';
  });
  document.getElementById('refuse-cookies').addEventListener('click', () => {
    localStorage.setItem('cookieConsent', 'refused');
    document.getElementById('cookie-banner').style.display = 'none';
  });
</script>
`;

  const antiAdblock = `
<div id="ad-test" class="adsbox" style="width: 1px; height: 1px; position: absolute; left: -999px;"></div>
<script>
window.addEventListener('load', () => {
  setTimeout(() => {
    const adTest = document.getElementById('ad-test');
    if (!adTest || adTest.offsetHeight === 0) {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(31,36,48,0.95);z-index:10000;display:flex;align-items:center;justify-content:center;color:#fff;text-align:center;padding:20px;';
      overlay.innerHTML = '<div style="max-width:500px;background:#fff;color:#1f2430;padding:40px;border-radius:8px;border-bottom:4px solid #ddc076;"><h2>Désactivez votre bloqueur de publicités</h2><p style="margin:20px 0;">Le site de BOS & BOP n\\'affiche pas de publicités, mais certains scripts strictement nécessaires à son bon fonctionnement (navigation, boutique) sont bloqués par votre extension.</p><button onclick="location.reload()" style="background:#ddc076;border:none;padding:12px 24px;border-radius:4px;font-weight:bold;cursor:pointer;color:#1f2430;">J\\'ai désactivé mon bloqueur</button></div>';
      document.body.appendChild(overlay);
    }
  }, 500);
});
</script>
`;

  if (!html.includes('cookie-banner')) {
    html = html.replace('{{EXTRA_TAIL}}', cookieBanner + antiAdblock + '\n{{EXTRA_TAIL}}');
    fs.writeFileSync(filePath, html);
    console.log('Appended cookie banner and anti-adblock to tail.html');
  } else {
    console.log('Scripts already present.');
  }
}

injectScripts();
