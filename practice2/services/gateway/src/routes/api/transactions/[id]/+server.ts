import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { transactions, categories } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/transactions/:id - Get a single transaction
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    const transactionId = parseInt(params.id);
    if (isNaN(transactionId)) {
      return error(400, { message: 'Invalid transaction ID' });
    }

    if (!locals.user) return error(401, { message: 'Unauthorized' });
    const userId = locals.user.id;

    const [transaction] = await db
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
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
      .limit(1);

    if (!transaction) {
      return error(404, { message: 'Transaction not found' });
    }

    return json({
      success: true,
      data: transaction
    });
  } catch (err) {
    console.error('Error fetching transaction:', err);
    return error(500, {
      message: 'Failed to fetch transaction'
    });
  }
};

// PUT /api/transactions/:id - Update a transaction
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    const transactionId = parseInt(params.id);
    if (isNaN(transactionId)) {
      return error(400, { message: 'Invalid transaction ID' });
    }

    if (!locals.user) return error(401, { message: 'Unauthorized' });
    const userId = locals.user.id;

    const body = await request.json();
    const { categoryId, amount, description, createdAt } = body;

    const [existingTransaction] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
      .limit(1);

    if (!existingTransaction) {
      return error(404, { message: 'Transaction not found' });
    }

    const updateData: Partial<typeof transactions.$inferInsert> = {};

    if (categoryId !== undefined) {
      if (typeof categoryId !== 'number') {
        return error(400, { message: 'Category ID must be a number' });
      }
      const [category] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
        .limit(1);

      if (!category) {
        return error(404, { message: 'Category not found' });
      }
      updateData.categoryId = categoryId;
    }

    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        return error(400, { message: 'Amount must be a positive number' });
      }
      updateData.amount = Math.round(amount);
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (createdAt !== undefined) {
      updateData.createdAt = new Date(createdAt);
    }

    const [updatedTransaction] = await db
      .update(transactions)
      .set(updateData)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
      .returning();

    return json({
      success: true,
      data: updatedTransaction,
      message: 'Transaction updated successfully'
    });
  } catch (err) {
    console.error('Error updating transaction:', err);
    return error(500, {
      message: 'Failed to update transaction'
    });
  }
};

// DELETE /api/transactions/:id - Delete a transaction
export const DELETE: RequestHandler = async ({ params, locals }) => {
  try {
    const transactionId = parseInt(params.id);
    if (isNaN(transactionId)) {
      return error(400, { message: 'Invalid transaction ID' });
    }

    if (!locals.user) return error(401, { message: 'Unauthorized' });
    const userId = locals.user.id;

    const [existingTransaction] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
      .limit(1);

    if (!existingTransaction) {
      return error(404, { message: 'Transaction not found' });
    }

    await db
      .delete(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));

    return json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting transaction:', err);
    return error(500, {
      message: 'Failed to delete transaction'
    });
  }
};
