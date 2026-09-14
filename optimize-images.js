const fs = require('fs');

const path = 'src/lib/shop.ts';
let code = fs.readFileSync(path, 'utf8');

const oldImg = `return \`<div style="\${frame}"><img alt="\${escapeHtml(product.title)}" src="\${escapeHtml(product.imageUrl)}" style="max-width:100%;max-height:100%;object-fit:contain;"/></div>\`;`;
const newImg = `return \`<div style="\${frame}"><img alt="\${escapeHtml(product.title)}" src="\${escapeHtml(product.imageUrl)}" loading="lazy" decoding="async" style="max-width:100%;max-height:100%;object-fit:contain;"/></div>\`;`;

const oldCarouselImg = `<img src="\${escapeHtml(img)}" alt="Image \${i+1}" style="max-width: 100%; height: auto; max-height: 400px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);" />`;
const newCarouselImg = `<img src="\${escapeHtml(img)}" alt="Image \${i+1}" loading="lazy" decoding="async" style="max-width: 100%; height: auto; max-height: 400px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);" />`;

code = code.replace(oldImg, newImg);
code = code.replace(oldCarouselImg, newCarouselImg);

fs.writeFileSync(path, code);
console.log('Image optimization added');
