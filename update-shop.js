const fs = require('fs');

function updateShopTs() {
  const filePath = 'src/lib/shop.ts';
  let code = fs.readFileSync(filePath, 'utf8');

  // Replace the address textarea with the autocomplete version
  const oldAddress = '<p><label style="font-weight:600;">Adresse de livraison<span class="required">*</span><br/><textarea name="address" required="required" rows="4" style="${input}"></textarea></label></p>';
  const newAddress = `
  <p style="position:relative; z-index:100;">
    <label style="font-weight:600;">Adresse de livraison<span class="required">*</span><br/>
      <textarea id="address-input" name="address" required="required" rows="3" style="\${input} resize:vertical;" autocomplete="off" placeholder="Commencez à taper votre adresse..."></textarea>
    </label>
    <ul id="address-suggestions" style="position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid #ccc; max-height:200px; overflow-y:auto; z-index:1000; list-style:none; margin:0; padding:0; display:none; box-shadow:0 4px 6px rgba(0,0,0,0.1); border-radius:4px;"></ul>
  </p>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const input = document.getElementById('address-input');
      const suggestions = document.getElementById('address-suggestions');
      let timeoutId;
      input.addEventListener('input', (e) => {
        clearTimeout(timeoutId);
        const query = e.target.value;
        if (query.length < 5) { suggestions.style.display = 'none'; return; }
        timeoutId = setTimeout(() => {
          fetch('https://api-adresse.data.gouv.fr/search/?q=' + encodeURIComponent(query) + '&limit=5')
            .then(res => res.json())
            .then(data => {
              if (data.features && data.features.length > 0) {
                suggestions.innerHTML = '';
                data.features.forEach(feature => {
                  const li = document.createElement('li');
                  li.style.padding = '10px'; li.style.cursor = 'pointer'; li.style.borderBottom = '1px solid #eee';
                  li.textContent = feature.properties.label;
                  li.addEventListener('mouseover', () => li.style.backgroundColor = '#f4f5f8');
                  li.addEventListener('mouseout', () => li.style.backgroundColor = 'white');
                  li.addEventListener('click', () => {
                    input.value = feature.properties.label;
                    suggestions.style.display = 'none';
                  });
                  suggestions.appendChild(li);
                });
                suggestions.style.display = 'block';
              } else { suggestions.style.display = 'none'; }
            });
        }, 300);
      });
      document.addEventListener('click', (e) => {
        if (e.target !== input && e.target !== suggestions) suggestions.style.display = 'none';
      });
    });
  </script>
  `;

  // Replace the note textarea and add the newsletter checkbox right below it
  const oldNote = '<p><label style="font-weight:600;">Remarque (facultatif)<br/><textarea name="note" rows="3" style="${input}"></textarea></label></p>';
  const newNote = `
  <p><label style="font-weight:600;">Remarque (facultatif)<br/><textarea name="note" rows="3" style="\${input}"></textarea></label></p>
  <div style="border: 2px solid \${GOLD}; background-color: #fbf7ea; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: left; display: flex; align-items: flex-start; gap: 12px; box-shadow: 0 2px 8px rgba(221,192,118,0.2);">
    <input type="checkbox" id="newsletter" name="newsletter" value="true" style="margin-top: 4px; transform: scale(1.6); cursor: pointer; accent-color: \${NAVY};" />
    <label for="newsletter" style="cursor: pointer; font-weight: 700; color: \${NAVY}; font-size: 15px; margin: 0; line-height: 1.3;">
      OUI, je souhaite recevoir les offres privilèges, les actualités et les conseils exclusifs de BOS & BOP !
      <div style="font-weight: normal; font-size: 13px; color: #555; margin-top: 6px; line-height: 1.4;">
        Rejoignez notre communauté en exclusivité. Désinscription possible à tout moment en un clic. Promis, on ne spamme pas !
      </div>
    </label>
  </div>
  `;

  if (code.includes(oldAddress) && code.includes(oldNote)) {
    code = code.replace(oldAddress, newAddress);
    code = code.replace(oldNote, newNote);
    fs.writeFileSync(filePath, code);
    console.log('Successfully updated shop.ts with newsletter and address autocomplete');
  } else {
    console.log('Could not find target strings in shop.ts');
  }
}

updateShopTs();
