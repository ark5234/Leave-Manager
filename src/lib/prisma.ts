import clientPkg from '@prisma/client';

// Prisma v7 has different client packaging; access the constructor dynamically
const PrismaClientCtor: any = (clientPkg as any).PrismaClient ?? (clientPkg as any).default?.PrismaClient ?? clientPkg;

// Construct without passing `datasources` (Prisma v7 expects config in prisma.config.ts / env)
const prisma: any = new PrismaClientCtor();

export default prisma;