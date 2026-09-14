const fs = require('fs');

function updateCrmClient() {
  const filePath = 'src/app/admin/(panel)/crm/CrmClientWrapper.tsx';
  let code = fs.readFileSync(filePath, 'utf8');

  // Add import
  if (!code.includes('RichTextEditor')) {
    code = code.replace(
      'import { formatDate } from "@/lib/format";',
      'import { formatDate } from "@/lib/format";\nimport RichTextEditor from "@/components/admin/RichTextEditor";'
    );
  }

  // Add state for content
  if (!code.includes('const [content, setContent] = useState(')) {
    code = code.replace(
      'const [success, setSuccess] = useState<string | null>(null);',
      'const [success, setSuccess] = useState<string | null>(null);\n  const [content, setContent] = useState("");'
    );
  }

  // Replace textarea
  const oldTextarea = '<textarea name="content" required rows={12} placeholder="Bonjour à tous,\\n\\nC\'est avec un grand plaisir que je vous annonce..."></textarea>';
  const newEditor = `
              <input type="hidden" name="content" value={content} />
              <RichTextEditor value={content} onChange={setContent} />
  `;
  if (code.includes(oldTextarea)) {
    code = code.replace(oldTextarea, newEditor);
    
    // Also reset content on success
    code = code.replace(
      'e.currentTarget.reset();\n    } catch (err: any) {',
      'e.currentTarget.reset();\n      setContent("");\n    } catch (err: any) {'
    );
    
    fs.writeFileSync(filePath, code);
    console.log('Successfully updated CrmClientWrapper to use RichTextEditor');
  } else {
    console.log('Could not find textarea to replace');
  }
}

updateCrmClient();
