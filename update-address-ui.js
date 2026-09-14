const fs = require('fs');

const shopPath = 'src/lib/shop.ts';
let shopCode = fs.readFileSync(shopPath, 'utf8');

const oldLoop = `                data.features.forEach(feature => {
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
                });`;

const newLoop = `                data.features.forEach(feature => {
                  const li = document.createElement('li');
                  li.style.padding = '12px 16px'; 
                  li.style.cursor = 'pointer'; 
                  li.style.borderBottom = '1px solid #f1f5f9';
                  li.style.transition = 'background-color 0.2s ease';
                  
                  const p = feature.properties;
                  const streetName = p.name || p.label.split(p.postcode)[0] || p.label;
                  
                  li.innerHTML = \`
                    <div style="display: flex; align-items: flex-start; gap: 14px;">
                      <div style="color: #ddc076; flex-shrink: 0; margin-top: 2px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      </div>
                      <div style="flex-grow: 1;">
                        <div style="font-weight: 600; color: #1f2430; font-size: 15px; margin-bottom: 2px;">\${streetName}</div>
                        \${p.postcode ? \`<div style="color: #6b7280; font-size: 13px;">\${p.postcode} \${p.city}</div>\` : ''}
                        \${p.context ? \`<div style="color: #9ba3b5; font-size: 11px; margin-top: 3px;">\${p.context}</div>\` : ''}
                      </div>
                    </div>
                  \`;
                  
                  li.addEventListener('mouseover', () => li.style.backgroundColor = '#f8fafc');
                  li.addEventListener('mouseout', () => li.style.backgroundColor = 'white');
                  li.addEventListener('click', () => {
                    input.value = feature.properties.label;
                    input.setCustomValidity(""); // Adresse validée !
                    suggestions.style.display = 'none';
                  });
                  suggestions.appendChild(li);
                });`;

if (shopCode.includes('data.features.forEach(feature => {')) {
  shopCode = shopCode.replace(oldLoop, newLoop);
  
  // Update the UL styling to be more modern
  const oldUl = 'max-height:200px; overflow-y:auto; z-index:1000; list-style:none; margin:0; padding:0; display:none; box-shadow:0 4px 6px rgba(0,0,0,0.1); border-radius:4px;';
  const newUl = 'max-height:350px; overflow-y:auto; z-index:1000; list-style:none; margin:0; padding:0; display:none; box-shadow:0 10px 25px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05); border-radius:8px; border:1px solid #e2e8f0; border-top:none; border-top-left-radius:0; border-top-right-radius:0;';
  shopCode = shopCode.replace(oldUl, newUl);
  
  fs.writeFileSync(shopPath, shopCode);
  console.log('Address suggestions UI deeply improved');
} else {
  console.log('Could not find loop to replace');
}
