import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
  try {
    const result = await db.execute(sql`SELECT NOW() as current_time, version() as pg_version`);
    const row = result[0] as { current_time: Date; pg_version: string } | undefined;

    return json({
      success: true,
      message: 'Database connection successful',
      data: {
        currentTime: row?.current_time?.toString(),
        pgVersion: row?.pg_version
      }
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return json(
      {
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};
