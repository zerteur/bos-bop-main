const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const pages = await prisma.page.findMany();
  for (const p of pages) {
    let contentChanged = false;
    let headChanged = false;

    // 1. Image loading="lazy"
    let newContent = p.contentHtml.replace(/<img(.*?)>/gi, (match, g1) => {
      if (match.includes('loading=')) return match;
      return `<img${g1} loading="lazy">`;
    });
    
    // Explicit dimensions on a few known images (homepage hero images if they lack them)
    // Actually, adding lazy loading is the main goal to save bandwidth.

    if (newContent !== p.contentHtml) contentChanged = true;

    // 2. Defer JS in headHtml
    let newHead = p.headHtml;
    newHead = newHead.replace(/<script src="\/assets\/js\/(.*?).js"><\/script>/g, '<script src="/assets/js/$1.js" defer></script>');
    newHead = newHead.replace(/<script src="\/js\/contact-form.js"><\/script>/g, '<script src="/js/contact-form.js" defer></script>');
    newHead = newHead.replace(/<script src="\/assets\/js\/(.*?)_sdk.js"><\/script>/g, '<script src="/assets/js/$1_sdk.js" defer></script>');
    
    // And for any AddToAny or Facebook scripts, let's just make sure all local scripts are deferred.
    // The `<script src="..._fr.js"></script>` at the end of body is in tail.html.
    
    if (newHead !== p.headHtml) headChanged = true;

    if (contentChanged || headChanged) {
      await prisma.page.update({ 
        where: { id: p.id }, 
        data: { 
          contentHtml: contentChanged ? newContent : p.contentHtml,
          headHtml: headChanged ? newHead : p.headHtml 
        } 
      });
      console.log('Updated DB assets/lazy for', p.slug || 'HOME');
    }
  }
}
run();
