import { prisma } from '../lib/prisma';

export const notificationTemplateRepository = {
  findByKey(key: string) {
    return prisma.notificationTemplate.findUnique({ where: { key } });
  },

  findMany(args?: { where?: { isActive?: boolean } }) {
    return prisma.notificationTemplate.findMany({
      where: args?.where,
      orderBy: { key: 'asc' },
    });
  },

  create(data: { key: string; titleTemplate: string; bodyTemplate: string; type?: string; isActive?: boolean }) {
    return prisma.notificationTemplate.create({ data: data as any });
  },

  update(key: string, data: { titleTemplate?: string; bodyTemplate?: string; type?: string; isActive?: boolean }) {
    return prisma.notificationTemplate.update({ where: { key }, data: data as any });
  },

  delete(key: string) {
    return prisma.notificationTemplate.delete({ where: { key } });
  },
};
