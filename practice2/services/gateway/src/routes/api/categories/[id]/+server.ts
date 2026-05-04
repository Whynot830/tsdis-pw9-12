import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { categories, transactions } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/categories/:id - Get a single category
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    const categoryId = parseInt(params.id);
    if (isNaN(categoryId)) {
      return error(400, { message: 'Invalid category ID' });
    }

    if (!locals.user) return error(401, { message: 'Unauthorized' });
    const userId = locals.user.id;

    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
      .limit(1);

    if (!category) {
      return error(404, { message: 'Category not found' });
    }

    return json({
      success: true,
      data: category
    });
  } catch (err) {
    console.error('Error fetching category:', err);
    return error(500, {
      message: 'Failed to fetch category'
    });
  }
};

// PUT /api/categories/:id - Update a category
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    const categoryId = parseInt(params.id);
    if (isNaN(categoryId)) {
      return error(400, { message: 'Invalid category ID' });
    }

    if (!locals.user) return error(401, { message: 'Unauthorized' });
    const userId = locals.user.id;

    const body = await request.json();
    const { name, icon, color } = body;

    const [existingCategory] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
      .limit(1);

    if (!existingCategory) {
      return error(404, { message: 'Category not found' });
    }

    const updateData: Partial<typeof categories.$inferInsert> = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return error(400, { message: 'Category name cannot be empty' });
      }
      const [duplicate] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.userId, userId), eq(categories.name, name.trim())))
        .limit(1);

      if (duplicate && duplicate.id !== categoryId) {
        return error(409, { message: 'A category with this name already exists' });
      }
      updateData.name = name.trim();
    }
    if (icon !== undefined) {
      updateData.icon = icon?.trim() || null;
    }
    if (color !== undefined) {
      if (typeof color !== 'string' || color.trim().length === 0) {
        return error(400, { message: 'Category color cannot be empty' });
      }
      updateData.color = color.trim();
    }

    const [updatedCategory] = await db
      .update(categories)
      .set(updateData)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
      .returning();

    return json({
      success: true,
      data: updatedCategory,
      message: 'Category updated successfully'
    });
  } catch (err) {
    console.error('Error updating category:', err);
    return error(500, {
      message: 'Failed to update category'
    });
  }
};

// DELETE /api/categories/:id - Delete a category
export const DELETE: RequestHandler = async ({ params, locals }) => {
  try {
    const categoryId = parseInt(params.id);
    if (isNaN(categoryId)) {
      return error(400, { message: 'Invalid category ID' });
    }

    if (!locals.user) return error(401, { message: 'Unauthorized' });
    const userId = locals.user.id;

    const [existingCategory] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
      .limit(1);

    if (!existingCategory) {
      return error(404, { message: 'Category not found' });
    }

    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.categoryId, categoryId))
      .limit(1);

    if (transaction) {
      return error(400, {
        message: 'Cannot delete category with existing transactions'
      });
    }

    await db
      .delete(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));

    return json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting category:', err);
    return error(500, {
      message: 'Failed to delete category'
    });
  }
};
