const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  await prisma.page.update({ 
    where: { slug: '' }, 
    data: { 
      title: 'BOS & BOP - Orientation scolaire et professionnelle', 
      metaDescription: "Bilan d'Orientation Scolaire et Professionnel à 360°. Un accompagnement sérieux et agréable pour faire les bons choix d'avenir." 
    } 
  });
  console.log('Updated homepage SEO metadata');
}
run();
