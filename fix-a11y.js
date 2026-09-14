const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const pages = await prisma.page.findMany();
  for (const p of pages) {
    let newContent = p.contentHtml;
    
    newContent = newContent.replace(/<h4>(.*?)LA M&Eacute;THODE BOS(.*?)<\/h4>/i, '<h2>$1LA M&Eacute;THODE BOS$2</h2>');
    newContent = newContent.replace(/<h4>(.*?)La m&eacute;thode BOS(.*?)<\/h4>/i, '<h2>$1La m&eacute;thode BOS$2</h2>');
    newContent = newContent.replace(/<h4>(.*?)CONTACTER BOS &amp; BOP(.*?)<\/h4>/i, '<h2>$1CONTACTER BOS &amp; BOP$2</h2>');
    
    // Fix contrast on homepage specific items
    newContent = newContent.replace(/<h3>Dirigeants:<\/h3>/gi, '<h3 style="color: #ffffff;">Dirigeants:</h3>');
    newContent = newContent.replace(/<h3>Lycéens :<\/h3>/gi, '<h3 style="color: #ffffff;">Lycéens :</h3>');
    newContent = newContent.replace(/<h3>Lyc&eacute;ens :<\/h3>/gi, '<h3 style="color: #ffffff;">Lyc&eacute;ens :</h3>');
    newContent = newContent.replace(/<h3>Étudiants :<\/h3>/gi, '<h3 style="color: #ffffff;">Étudiants :</h3>');
    newContent = newContent.replace(/<h3>&Eacute;tudiants :<\/h3>/gi, '<h3 style="color: #ffffff;">&Eacute;tudiants :</h3>');
    newContent = newContent.replace(/<h3>Adultes :<\/h3>/gi, '<h3 style="color: #ffffff;">Adultes :</h3>');
    
    // Identical links fix
    newContent = newContent.replace(/<a href="\/">BOS &amp; BOP<\/a>/g, '<a href="/" aria-label="Accueil BOS &amp; BOP">BOS &amp; BOP</a>');
    
    if (newContent !== p.contentHtml) {
      console.log('Updating page', p.slug || 'HOME');
      await prisma.page.update({ where: { id: p.id }, data: { contentHtml: newContent } });
    }
  }
}
run();
