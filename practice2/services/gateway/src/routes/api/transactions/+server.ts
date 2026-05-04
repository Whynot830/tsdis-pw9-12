import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { transactions, categories } from '$lib/server/db/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { notifyWorkerRecalculate } from '$lib/server/worker-notify';

// GET /api/transactions - Get all transactions for current user (with optional filters)
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    if (!locals.user) return error(401, { message: 'Unauthorized' });
    const userId = locals.user.id;

    const categoryId = url.searchParams.get('categoryId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let whereConditions = [eq(transactions.userId, userId)];

    if (categoryId) {
      const catId = parseInt(categoryId);
      if (!isNaN(catId)) {
        whereConditions.push(eq(transactions.categoryId, catId));
      }
    }

    if (startDate) {
      whereConditions.push(gte(transactions.createdAt, new Date(startDate)));
    }

    if (endDate) {
      whereConditions.push(lte(transactions.createdAt, new Date(endDate)));
    }

    const userTransactions = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        categoryId: transactions.categoryId,
        amount: transactions.amount,
        description: transactions.description,
        createdAt: transactions.createdAt,
        category: {
          id: categories.id,
          name: categories.name,
          icon: categories.icon,
          color: categories.color
        }
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...whereConditions))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select()
      .from(transactions)
      .where(and(...whereConditions));

    return json({
      success: true,
      data: userTransactions,
      pagination: {
        limit,
        offset,
        total: countResult.length
      }
    });
  } catch (err) {
    console.error('Error fetching transactions:', err);
    return error(500, {
      message: 'Failed to fetch transactions'
    });
  }
};

// POST /api/transactions - Create a new transaction
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    if (!locals.user) return error(401, { message: 'Unauthorized' });
    const userId = locals.user.id;

    const body = await request.json();
    const { categoryId, amount, description, createdAt } = body;

    if (!categoryId || typeof categoryId !== 'number') {
      return error(400, { message: 'Category ID is required and must be a number' });
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return error(400, { message: 'Amount is required and must be a positive number' });
    }

    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
      .limit(1);

    if (!category) {
      return error(404, { message: 'Category not found' });
    }

    const [newTransaction] = await db
      .insert(transactions)
      .values({
        userId,
        categoryId,
        amount: Math.round(amount), // Ensure integer (kopecks)
        description: description?.trim() || null,
        createdAt: createdAt ? new Date(createdAt) : new Date()
      })
      .returning();

    notifyWorkerRecalculate(env.WORKER_INTERNAL_URL, env.INTERNAL_API_TOKEN, userId);

    return json({
      success: true,
      data: newTransaction,
      message: 'Transaction created successfully'
    });
  } catch (err) {
    console.error('Error creating transaction:', err);
    return error(500, {
      message: 'Failed to create transaction'
    });
  }
};
