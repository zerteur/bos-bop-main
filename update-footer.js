const fs = require('fs');

function updateFooter() {
  let html = fs.readFileSync('templates/footer.html', 'utf8');
  
  const searchStr = '<p><a href="https://pierre-communication.com/"';
  const startIndex = html.indexOf(searchStr);
  
  if (startIndex > -1) {
    const endIndex = html.indexOf('</p>', startIndex) + '</p>'.length;
    
    const before = html.substring(0, startIndex);
    const after = html.substring(endIndex);
    
    const replacement = `<p>Design original : <a href="https://pierre-communication.com/" target="_blank" rel="noopener">Agence Pierre Com'</a> - Refonte technique & maintenance : <a href="https://www.lproudhom.fr/" target="_blank" rel="noopener">L. PROUDHOM</a></p>`;
    
    fs.writeFileSync('templates/footer.html', before + replacement + after);
    console.log('Successfully updated footer.html');
  } else {
    console.log('Could not find the target string in footer.html');
  }
}

updateFooter();
