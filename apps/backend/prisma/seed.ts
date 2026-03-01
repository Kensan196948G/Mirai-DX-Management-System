import { PrismaClient, OrgType, RoleName, ClientType, ProjectStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { code: 'HQ-001' },
    update: {},
    create: {
      name: '山田建設株式会社',
      code: 'HQ-001',
      type: OrgType.HQ,
    },
  });
  console.log('✅ Organization:', org.name);

  // 2. Roles
  const rolesData = [
    { name: RoleName.SYSTEM_ADMIN, displayName: 'システム管理者', description: 'システム全体の管理権限' },
    { name: RoleName.BRANCH_ADMIN, displayName: '支店管理者', description: '支店レベルの管理権限' },
    { name: RoleName.SUPERVISOR, displayName: '現場監督', description: '現場監督権限' },
    { name: RoleName.WORKER, displayName: '作業員', description: '作業員権限' },
    { name: RoleName.VIEWER, displayName: '閲覧者', description: '閲覧のみ' },
  ];

  const roles: Record<string, { id: string }> = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: r,
    });
    roles[r.name] = role;
    console.log('✅ Role:', role.displayName);
  }

  // 3. User (admin)
  const admin = await prisma.user.upsert({
    where: { auth0UserId: 'auth0|dev-admin' },
    update: {},
    create: {
      auth0UserId: 'auth0|dev-admin',
      email: 'admin@example.com',
      name: '管理者',
      organizationId: org.id,
    },
  });
  console.log('✅ User:', admin.name);

  // 4. UserRole (system_admin)
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: roles[RoleName.SYSTEM_ADMIN]!.id } },
    update: {},
    create: {
      userId: admin.id,
      roleId: roles[RoleName.SYSTEM_ADMIN]!.id,
    },
  });
  console.log('✅ UserRole: 管理者 -> system_admin');

  // 5. Projects
  const project1 = await prisma.project.upsert({
    where: { code: 'PRJ-2024-001' },
    update: {},
    create: {
      code: 'PRJ-2024-001',
      name: '国道XX号線舗装工事',
      clientName: '国土交通省',
      clientType: ClientType.PUBLIC,
      constructionType: '舗装工事',
      status: ProjectStatus.IN_PROGRESS,
      startDate: new Date('2024-04-01'),
      endDate: new Date('2024-09-30'),
      organizationId: org.id,
      supervisorId: admin.id,
      createdBy: admin.id,
    },
  });
  console.log('✅ Project:', project1.name);

  const project2 = await prisma.project.upsert({
    where: { code: 'PRJ-2024-002' },
    update: {},
    create: {
      code: 'PRJ-2024-002',
      name: '○○ビル建設工事',
      clientName: 'ABC商事',
      clientType: ClientType.PRIVATE,
      constructionType: '建築工事',
      status: ProjectStatus.PREPARING,
      startDate: new Date('2024-07-01'),
      endDate: new Date('2025-03-31'),
      organizationId: org.id,
      supervisorId: admin.id,
      createdBy: admin.id,
    },
  });
  console.log('✅ Project:', project2.name);

  console.log('\n✅ Seed完了: 作成レコード数');
  console.log('  - Organization: 1');
  console.log('  - Roles: 5');
  console.log('  - Users: 1');
  console.log('  - UserRoles: 1');
  console.log('  - Projects: 2');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
