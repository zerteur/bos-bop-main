const fs = require('fs');

const shopPath = 'src/lib/shop.ts';
let shopCode = fs.readFileSync(shopPath, 'utf8');

const openDropdown = `suggestions.style.display = 'block';`;
const openDropdownReplacement = `suggestions.style.display = 'block';
                input.style.borderBottomLeftRadius = '0';
                input.style.borderBottomRightRadius = '0';`;

const closeDropdown1 = `suggestions.style.display = 'none'; }`;
const closeDropdown1Replacement = `suggestions.style.display = 'none'; 
                input.style.borderBottomLeftRadius = '5px';
                input.style.borderBottomRightRadius = '5px';
              }`;

const closeDropdown2 = `suggestions.style.display = 'none'; return; }`;
const closeDropdown2Replacement = `suggestions.style.display = 'none';
        input.style.borderBottomLeftRadius = '5px';
        input.style.borderBottomRightRadius = '5px';
        return; }`;

const closeDropdown3 = `if (e.target !== input && e.target !== suggestions) suggestions.style.display = 'none';`;
const closeDropdown3Replacement = `if (e.target !== input && e.target !== suggestions) {
          suggestions.style.display = 'none';
          input.style.borderBottomLeftRadius = '5px';
          input.style.borderBottomRightRadius = '5px';
        }`;

const closeDropdown4 = `suggestions.style.display = 'none';
                  });`;
const closeDropdown4Replacement = `suggestions.style.display = 'none';
                    input.style.borderBottomLeftRadius = '5px';
                    input.style.borderBottomRightRadius = '5px';
                  });`;                  

shopCode = shopCode.replace(openDropdown, openDropdownReplacement);
shopCode = shopCode.replace(closeDropdown1, closeDropdown1Replacement);
shopCode = shopCode.replace(closeDropdown2, closeDropdown2Replacement);
shopCode = shopCode.replace(closeDropdown3, closeDropdown3Replacement);
shopCode = shopCode.replace(closeDropdown4, closeDropdown4Replacement);

fs.writeFileSync(shopPath, shopCode);
console.log('Dynamic border radius added');
