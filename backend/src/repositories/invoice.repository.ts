import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const invoiceRepository = {
  findById(id: string) {
    return prisma.invoice.findUnique({
      where: { id },
      include: {
        payment: {
          include: {
            student: { include: { user: { select: { fullName: true } } } },
            teacher: { include: { user: { select: { fullName: true } } } },
          },
        },
      },
    });
  },

  findByInvoiceNumber(invoiceNumber: string) {
    return prisma.invoice.findUnique({
      where: { invoiceNumber },
    });
  },

  findMany(args: Prisma.InvoiceFindManyArgs) {
    return prisma.invoice.findMany(args);
  },

  count(where: Prisma.InvoiceWhereInput) {
    return prisma.invoice.count({ where });
  },

  create(data: Prisma.InvoiceCreateInput, tx?: any) {
    const client = tx || prisma;
    return client.invoice.create({ data });
  },

  update(id: string, data: Prisma.InvoiceUpdateInput, tx?: any) {
    const client = tx || prisma;
    return client.invoice.update({ where: { id }, data });
  },

  findMaxInvoiceNumber(tx?: any) {
    const client = tx || prisma;
    return client.invoice.findFirst({
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });
  },

  aggregate(where: Prisma.InvoiceWhereInput) {
    return prisma.invoice.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    });
  },

  findManyForExport(args: Prisma.InvoiceFindManyArgs) {
    return prisma.invoice.findMany({ ...args, take: 100000 });
  },
};
