const fs = require('fs');

const shopPath = 'src/lib/shop.ts';
let shopCode = fs.readFileSync(shopPath, 'utf8');

const badInnerHtml = `                  li.innerHTML = \`
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
                  \`;`;

const fixedInnerHtml = `                  li.innerHTML = 
                    '<div style="display: flex; align-items: flex-start; gap: 14px;">' +
                      '<div style="color: #ddc076; flex-shrink: 0; margin-top: 2px;">' +
                        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>' +
                      '</div>' +
                      '<div style="flex-grow: 1;">' +
                        '<div style="font-weight: 600; color: #1f2430; font-size: 15px; margin-bottom: 2px;">' + streetName + '</div>' +
                        (p.postcode ? '<div style="color: #6b7280; font-size: 13px;">' + p.postcode + ' ' + p.city + '</div>' : '') +
                        (p.context ? '<div style="color: #9ba3b5; font-size: 11px; margin-top: 3px;">' + p.context + '</div>' : '') +
                      '</div>' +
                    '</div>';`;

shopCode = shopCode.replace(badInnerHtml, fixedInnerHtml);
fs.writeFileSync(shopPath, shopCode);
console.log('Fixed syntax error in shop.ts');
