const fs = require('fs');

const shopPath = 'src/lib/shop.ts';
let shopCode = fs.readFileSync(shopPath, 'utf8');

const oldScript = `    <ul id="address-suggestions" style="position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid #ccc; max-height:200px; overflow-y:auto; z-index:1000; list-style:none; margin:0; padding:0; display:none; box-shadow:0 4px 6px rgba(0,0,0,0.1); border-radius:4px;"></ul>
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
  </script>`;

const newScript = `    <ul id="address-suggestions" style="position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid #ccc; max-height:200px; overflow-y:auto; z-index:1000; list-style:none; margin:0; padding:0; display:none; box-shadow:0 4px 6px rgba(0,0,0,0.1); border-radius:4px;"></ul>
  </p>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const input = document.getElementById('address-input');
      const suggestions = document.getElementById('address-suggestions');
      
      // Force validation dès le départ (impossible de soumettre le formulaire sans choisir une adresse)
      input.setCustomValidity("Veuillez impérativement sélectionner une adresse valide dans la liste proposée.");
      
      let timeoutId;
      input.addEventListener('input', (e) => {
        // Dès qu'on tape, on invalide l'adresse car elle n'est plus issue d'un clic
        input.setCustomValidity("Veuillez impérativement sélectionner une adresse valide dans la liste proposée.");
        
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
                    input.setCustomValidity(""); // Adresse validée !
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
  </script>`;

shopCode = shopCode.replace(oldScript, newScript);
fs.writeFileSync(shopPath, shopCode);
console.log('Address validation improved');
