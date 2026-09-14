const fs = require('fs');

const cssPath = 'src/app/admin/admin.css';
let cssCode = fs.readFileSync(cssPath, 'utf8');

const oldTablesBlock = `  /* ---------- Tableaux ---------- */
  
  table.liste { width: 100%; border-collapse: collapse; background: var(--carte); border: 1px solid var(--bord); border-radius: 12px; overflow: hidden; }
  table.liste th, table.liste td { text-align: left; padding: 11px 14px; border-bottom: 1px solid var(--bord); vertical-align: middle; }
  table.liste th { background: #fafbfd; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--texte-2); border-bottom: 2px solid var(--bord); }
  table.liste tbody tr:hover { background: #fbfbfc; }
  table.liste { box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
  table.liste tr:last-child td { border-bottom: none; }
  table.liste tr.non-lu { font-weight: 600; background: #fffdf4; }
  table.liste img.mini { width: 44px; height: 44px; object-fit: cover; border-radius: 8px; border: 1px solid var(--bord); }`;

const newTablesBlock = `  /* ---------- Tableaux ---------- */

  table.liste { 
    width: 100%; 
    border-collapse: separate; /* Important for border-radius on rows */
    border-spacing: 0;
    background: #ffffff; 
    border: 1px solid #e2e8f0; 
    border-radius: 12px; 
    overflow: hidden; 
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
  }
  
  table.liste th, table.liste td { 
    text-align: left; 
    padding: 18px 24px; 
    border-bottom: 1px solid #e2e8f0; 
    vertical-align: middle; 
    font-size: 14.5px;
    color: #334155;
  }
  
  table.liste th { 
    background: #f8fafc; 
    font-size: 12.5px; 
    text-transform: uppercase; 
    letter-spacing: 0.8px; 
    color: #64748b; 
    font-weight: 700;
    border-bottom: 2px solid #e2e8f0; 
    white-space: nowrap;
  }
  
  table.liste tbody tr {
    transition: background-color 0.2s ease;
  }
  
  table.liste tbody tr:hover { 
    background-color: #f1f5f9; 
  }
  
  table.liste tbody tr:last-child td { 
    border-bottom: none; 
  }
  
  table.liste tr.non-lu { 
    background: #fefce8; 
  }
  table.liste tr.non-lu td {
    font-weight: 600; 
    color: #0f172a;
  }
  
  table.liste tr.non-lu:hover { 
    background: #fef08a; 
  }
  
  table.liste img.mini { 
    width: 48px; 
    height: 48px; 
    object-fit: cover; 
    border-radius: 8px; 
    border: 1px solid #e2e8f0; 
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  }
  
  table.liste td strong {
    color: #0f172a;
    font-weight: 600;
  }`;

if (cssCode.includes('table.liste th { background: #fafbfd;')) {
  cssCode = cssCode.replace(oldTablesBlock, newTablesBlock);
  fs.writeFileSync(cssPath, cssCode);
  console.log('Tables styling deeply improved');
} else {
  console.log('Could not find table styling block to replace');
}
