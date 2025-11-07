const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const servers = await prisma.server.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    console.log(servers);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
})();
