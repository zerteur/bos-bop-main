const fs = require('fs');

function updateTail() {
  let html = fs.readFileSync('templates/tail.html', 'utf8');
  
  // Find start and end of the addtoany block
  const start = html.indexOf('<div id="addtoany"');
  if (start > -1) {
    // We can also just remove the script
    html = html.replace(/<script src="\/assets\/js\/e12574d47cfd_fr\.js" defer><\/script>/g, '');
    
    // Replace the block
    const endStr = '</iframe></div></div>';
    const end = html.indexOf(endStr, start);
    
    if (end > -1) {
      const before = html.substring(0, start);
      const after = html.substring(end + endStr.length);
      fs.writeFileSync('templates/tail.html', before + after);
      console.log('Removed AddToAny from tail.html');
    } else {
      console.log('Could not find end of AddToAny block');
    }
  } else {
    console.log('AddToAny already removed or not found');
  }
}

updateTail();
