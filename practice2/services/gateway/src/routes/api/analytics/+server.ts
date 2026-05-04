import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { transactions, categories } from '$lib/server/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    if (!locals.user) return error(401, { message: 'Unauthorized' });
    const userId = locals.user.id;

    const monthParam = url.searchParams.get('month');

    const startDate = new Date(2020, 0, 1);

    const monthlyRows = await db
      .select({
        month: sql<string>`to_char(${transactions.createdAt}, 'YYYY-MM')`,
        total: sql<number>`sum(${transactions.amount})`
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), gte(transactions.createdAt, startDate)))
      .groupBy(sql`to_char(${transactions.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${transactions.createdAt}, 'YYYY-MM')`);

    let categoryStart: Date;
    let categoryEnd: Date;

    if (monthParam) {
      const [year, month] = monthParam.split('-').map(Number);
      categoryStart = new Date(year, month - 1, 1);
      categoryEnd = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      categoryStart = new Date(now.getFullYear(), now.getMonth(), 1);
      categoryEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const categoryRows = await db
      .select({
        categoryId: categories.id,
        name: categories.name,
        icon: categories.icon,
        color: categories.color,
        total: sql<number>`sum(${transactions.amount})`
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.createdAt, categoryStart),
          lte(transactions.createdAt, categoryEnd)
        )
      )
      .groupBy(categories.id, categories.name, categories.icon, categories.color)
      .orderBy(sql`sum(${transactions.amount}) desc`);

    const breakdownRows = await db
      .select({
        month: sql<string>`to_char(${transactions.createdAt}, 'YYYY-MM')`,
        categoryId: categories.id,
        name: categories.name,
        color: categories.color,
        total: sql<number>`sum(${transactions.amount})`
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(eq(transactions.userId, userId), gte(transactions.createdAt, startDate)))
      .groupBy(
        sql`to_char(${transactions.createdAt}, 'YYYY-MM')`,
        categories.id,
        categories.name,
        categories.color
      )
      .orderBy(sql`to_char(${transactions.createdAt}, 'YYYY-MM')`);

    return json({
      success: true,
      data: {
        monthlyTotals: monthlyRows.map((r) => ({
          month: r.month,
          total: Number(r.total)
        })),
        categoryTotals: categoryRows.map((r) => ({
          categoryId: r.categoryId,
          name: r.name,
          icon: r.icon,
          color: r.color,
          total: Number(r.total)
        })),
        monthlyCategoryBreakdown: breakdownRows.map((r) => ({
          month: r.month,
          categoryId: r.categoryId,
          name: r.name,
          color: r.color,
          total: Number(r.total)
        }))
      }
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    return error(500, { message: 'Failed to fetch analytics' });
  }
};
