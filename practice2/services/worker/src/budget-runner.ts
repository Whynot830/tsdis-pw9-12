import postgres from 'postgres';
import { isSpendingOverLimit, monthBoundsUtc, yearMonthUtc } from './budgets.js';
import { sendBudgetTelegramAlert } from './telegram.js';

type Sql = postgres.Sql;

export async function runBudgetCheck(sql: Sql, userId: string): Promise<void> {
  const yearMonth = yearMonthUtc();
  const { start, endExclusive } = monthBoundsUtc(yearMonth);

  const limits = await sql<
    { id: number; category_id: number; amount_limit_kopecks: number }[]
  >`
    select id, category_id, amount_limit_kopecks
    from budget_limits
    where user_id = ${userId} and year_month = ${yearMonth}
  `;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  for (const lim of limits) {
    const [{ total }] = await sql<{ total: bigint }[]>`
      select coalesce(sum(amount), 0)::bigint as total
      from transactions
      where user_id = ${userId}
        and category_id = ${lim.category_id}
        and created_at >= ${start}
        and created_at < ${endExclusive}
    `;

    const spent = Number(total);
    if (!isSpendingOverLimit(spent, lim.amount_limit_kopecks)) continue;

    const alertType = 'budget_exceeded';
    const already = await sql<{ ok: number }[]>`
      select 1 as ok
      from budget_alert_log
      where user_id = ${userId}
        and category_id = ${lim.category_id}
        and year_month = ${yearMonth}
        and alert_type = ${alertType}
      limit 1
    `;

    if (already.length > 0) continue;

    try {
      await sql`
        insert into budget_alert_log (user_id, category_id, year_month, alert_type)
        values (${userId}, ${lim.category_id}, ${yearMonth}, ${alertType})
      `;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('unique') && !msg.includes('duplicate')) throw e;
      continue;
    }

    const settings = await sql<{ telegram_chat_id: string | null }[]>`
      select telegram_chat_id from user_notification_settings where user_id = ${userId} limit 1
    `;
    const chatId = settings[0]?.telegram_chat_id ?? undefined;
    const text = `Бюджет превышен: категория #${lim.category_id}, месяц ${yearMonth}. Потрачено ${spent} коп., лимит ${lim.amount_limit_kopecks} коп.`;
    await sendBudgetTelegramAlert(botToken, chatId ?? undefined, text);
  }
}
