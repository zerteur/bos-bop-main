const fs = require('fs');
const path = 'src/app/admin/(panel)/crm/CrmClientWrapper.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'const handleSendNewsletter = async (e: React.FormEvent<HTMLFormElement>) => {\\n    e.preventDefault();',
  'const handleSendNewsletter = async (e: React.FormEvent<HTMLFormElement>) => {\\n    e.preventDefault();\\n    const form = e.currentTarget;'
);

code = code.replace('await sendNewsletterAction(new FormData(e.currentTarget));', 'await sendNewsletterAction(new FormData(form));');
code = code.replace('e.currentTarget.reset();', 'form.reset();');

code = code.replace(
  'const handleAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {\\n    e.preventDefault();',
  'const handleAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {\\n    e.preventDefault();\\n    const form = e.currentTarget;'
);

code = code.replace('await addCustomerAction(new FormData(e.currentTarget));', 'await addCustomerAction(new FormData(form));');
// The line below was already replaced successfully if it existed, but to be sure:
code = code.replace(/e\.currentTarget\.reset\(\);/g, 'form.reset();');

fs.writeFileSync(path, code);
console.log('Fixed currentTarget error');
