import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { categories } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/categories - Get all categories for current user
export const GET: RequestHandler = async ({ locals }) => {
  try {
    if (!locals.user) return error(401, { message: 'Unauthorized' });
    const userId = locals.user.id;

    const userCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(categories.createdAt);

    return json({
      success: true,
      data: userCategories
    });
  } catch (err) {
    console.error('Error fetching categories:', err);
    return error(500, { message: 'Failed to fetch categories' });
  }
};

// POST /api/categories - Create a new category
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    if (!locals.user) return error(401, { message: 'Unauthorized' });
    const userId = locals.user.id;

    const body = await request.json();
    const { name, icon, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return error(400, { message: 'Category name is required' });
    }

    if (!color || typeof color !== 'string') {
      return error(400, { message: 'Category color is required' });
    }

    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.name, name.trim())))
      .limit(1);

    if (existing) {
      return error(409, { message: 'A category with this name already exists' });
    }

    const [newCategory] = await db
      .insert(categories)
      .values({
        userId,
        name: name.trim(),
        icon: icon?.trim() || null,
        color: color.trim()
      })
      .returning();

    return json({
      success: true,
      data: newCategory,
      message: 'Category created successfully'
    });
  } catch (err) {
    console.error('Error creating category:', err);
    return error(500, { message: 'Failed to create category' });
  }
};
