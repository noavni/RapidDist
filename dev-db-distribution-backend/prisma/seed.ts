import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const main = async () => {
  const server = await prisma.serverReg.upsert({
    where: { dns: "sql-sample-01" },
    update: {},
    create: {
      name: "Sample SQL Server",
      dns: "sql-sample-01",
      databases: {
        create: [
          { dbName: "CRM", isActive: true },
          { dbName: "ERP", isActive: true },
        ],
      },
    },
    include: { databases: true },
  });

  await prisma.job.upsert({
    where: { id: "11111111-1111-1111-1111-111111111111" },
    update: {},
    create: {
      id: "11111111-1111-1111-1111-111111111111",
      ticket: "TICKET-123",
      server: server.dns,
      database: server.databases[0]?.dbName ?? "CRM",
      requestedBy: "seed@example.com",
      status: "PENDING",
    },
  });
};

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
