const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const rows = await p.cloudDeployment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, name: true, status: true, proxmoxVMID: true, statusMessage: true },
  });
  console.log(JSON.stringify(rows, null, 2));

  if (process.env.CLEAN_STUCK === '1') {
    const stuck = await p.cloudDeployment.updateMany({
      where: { status: { in: ['PROVISIONING', 'FAILED', 'PENDING'] } },
      data: { status: 'DELETED', statusMessage: 'Cleaned by AmerCloud ops script' },
    });
    console.log('Cleaned stuck:', stuck.count);
  }
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
