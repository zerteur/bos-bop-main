const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const pages = await prisma.page.findMany();
  for (const p of pages) {
    if (!p.headHtml.includes('apple-touch-icon')) {
      const newHtml = p.headHtml.replace('<title>', '<link rel="apple-touch-icon" href="/assets/images/64e819b161c6_favicon.ico">\n<title>');
      await prisma.page.update({ where: { id: p.id }, data: { headHtml: newHtml } });
    }
  }
  console.log('Added apple touch icon');
}
run();
