const fs = require('fs');

const shopPath = 'src/lib/shop.ts';
let shopCode = fs.readFileSync(shopPath, 'utf8');

const oldAddressBlockStart = `  <p style="position:relative; z-index:100;">
    <label style="font-weight:600;">Adresse de livraison<span class="required">*</span><br/>
      <textarea id="address-input" name="address" required="required" rows="3" style="\${input} resize:vertical;" autocomplete="off" placeholder="Commencez à taper votre adresse..."></textarea>
    </label>
    <ul id="address-suggestions"`;

const newAddressBlockStart = `  <div style="margin-bottom: 16px;">
    <label style="font-weight:600;" for="address-input">Adresse de livraison<span class="required">*</span></label>
    <div style="position:relative; z-index:100; margin-top:5px;">
      <textarea id="address-input" name="address" required="required" rows="3" style="\${input} resize:vertical; display:block; margin:0;" autocomplete="off" placeholder="Commencez à taper votre adresse..."></textarea>
      <ul id="address-suggestions"`;

shopCode = shopCode.replace(oldAddressBlockStart, newAddressBlockStart);

const oldAddressBlockEnd = `  </p>
  <script>`;

const newAddressBlockEnd = `    </div>
  </div>
  <script>`;

shopCode = shopCode.replace(oldAddressBlockEnd, newAddressBlockEnd);

fs.writeFileSync(shopPath, shopCode);
console.log('Fixed address prediction UI alignment');
