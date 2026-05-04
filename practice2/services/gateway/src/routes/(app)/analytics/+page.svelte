<script lang="ts">
  import { transactionsApi, categoriesApi, analyticsApi } from '$lib/api';
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import * as Select from '$lib/components/ui/select';
  import * as Chart from '$lib/components/ui/chart';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { Spinner } from '$lib/components/ui/spinner';
  import { AreaChart, Area, BarChart, ChartClipPath, PieChart, Text } from 'layerchart';
  import { curveCatmullRom } from 'd3-shape';
  import { cubicInOut } from 'svelte/easing';
  import { formatAmount, formatMonth, formatMonthChart, formatMonthShort } from '$lib/utils/format';
  import { IconDisplay } from '$lib/components/ui/icon-picker';
  import CategoryIcon from '$lib/components/category-icon.svelte';
  import { readableColor } from '$lib/utils.js';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { Input } from '$lib/components/ui/input';

  let selectedMonth = $state('');

  const analyticsQuery = analyticsApi.queries.useAnalytics(() => selectedMonth || undefined);
  const transactionsQuery = transactionsApi.queries.useTransactionsList({ limit: 500 });
  const categoriesQuery = categoriesApi.queries.useCategoriesList();

  const monthlyTotals = $derived(analyticsQuery.data?.monthlyTotals ?? []);
  const categoryTotals = $derived(analyticsQuery.data?.categoryTotals ?? []);
  const breakdownRows = $derived(analyticsQuery.data?.monthlyCategoryBreakdown ?? []);
  const transactions = $derived(transactionsQuery.data ?? []);
  const categories = $derived(categoriesQuery.data ?? []);
  const loading = $derived(
    analyticsQuery.isPending || transactionsQuery.isPending || categoriesQuery.isPending
  );

  const monthMin = $derived(
    monthlyTotals.length > 0 ? monthlyTotals[0]!.month : new Date().toISOString().slice(0, 7)
  );
  const monthMax = $derived(
    monthlyTotals.length > 0
      ? monthlyTotals[monthlyTotals.length - 1]!.month
      : new Date().toISOString().slice(0, 7)
  );

  const yearOptions = $derived.by(() => {
    const minY = Number(monthMin.slice(0, 4));
    const maxY = Number(monthMax.slice(0, 4));
    return Array.from({ length: maxY - minY + 1 }, (_, i) => minY + i);
  });

  let selectedPieCategories = $state<Set<number>>(new Set());
  let selectedBarCategories = $state<Set<number>>(new Set());

  const currentYear = new Date().getFullYear();
  let selectedAreaYear = $state('');
  let selectedBarYear = $state('');

  $effect(() => {
    const totals = monthlyTotals;
    const opts = yearOptions;
    if (totals.length > 0 && opts.length > 0 && !selectedMonth) {
      selectedMonth = totals[totals.length - 1]!.month;
      const latestYear = Number(totals[totals.length - 1]!.month.slice(0, 4));
      if (opts.includes(latestYear)) {
        selectedAreaYear = String(latestYear);
        selectedBarYear = String(latestYear);
      } else {
        selectedAreaYear = String(opts[opts.length - 1] ?? currentYear);
        selectedBarYear = String(opts[opts.length - 1] ?? currentYear);
      }
    }
  });

  function allMonthsForYear(year: string) {
    return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
  }

  const areaChartData = $derived.by(() => {
    if (!selectedAreaYear) return [];
    const totalsMap = new Map(monthlyTotals.map((m) => [m.month, m.total]));
    return allMonthsForYear(selectedAreaYear).map((month) => ({
      month,
      total: (totalsMap.get(month) ?? 0) / 100
    }));
  });

  const barChartData = $derived.by(() => {
    if (!selectedBarYear) return [];
    const months = allMonthsForYear(selectedBarYear);
    return months.map((month) => {
      const row: Record<string, unknown> = { month };
      breakdownRows
        .filter((r) => r.month === month)
        .forEach((r) => {
          if (selectedBarCategories.size === 0 || selectedBarCategories.has(r.categoryId)) {
            row[`cat_${r.categoryId}`] = r.total / 100;
          }
        });
      return row;
    });
  });

  const barSeries = $derived.by(() => {
    const relevantRows = selectedBarYear
      ? breakdownRows.filter((r) => r.month.startsWith(selectedBarYear))
      : breakdownRows;
    const catIds = [...new Set(relevantRows.map((r) => r.categoryId))];
    return catIds
      .filter((id) => selectedBarCategories.size === 0 || selectedBarCategories.has(id))
      .map((id) => {
        const found = relevantRows.find((r) => r.categoryId === id);
        return {
          key: `cat_${id}`,
          label: found?.name ?? String(id),
          color: found?.color ?? '#6b7280'
        };
      });
  });

  const pieDataFiltered = $derived.by(() => {
    const filtered =
      selectedPieCategories.size === 0
        ? categoryTotals
        : categoryTotals.filter((c) => selectedPieCategories.has(c.categoryId));
    return filtered.map((c) => ({
      key: c.name,
      value: c.total / 100,
      color: c.color
    }));
  });

  const pieTotal = $derived.by(() =>
    pieDataFiltered.reduce((s, d) => s + Math.round(d.value * 100), 0)
  );
  const totalAllTime = $derived(transactions.reduce((s, t) => s + t.amount, 0));
  const currentMonthTotal = $derived(
    selectedMonth ? categoryTotals.reduce((s, c) => s + c.total, 0) : 0
  );
  const avgMonthly = $derived(
    monthlyTotals.length > 0
      ? monthlyTotals.reduce((s, m) => s + m.total, 0) / monthlyTotals.length
      : 0
  );
  const topCategory = $derived(categoryTotals[0] ?? null);
</script>

<div class="container mx-auto max-w-6xl space-y-4 p-4 md:p-8">
  <div class="flex items-center gap-2">
    <Input
      type="month"
      bind:value={selectedMonth}
      min={monthMin}
      max={monthMax}
      disabled={loading}
    />
  </div>

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <Card.Root class="gap-0">
      <Card.Header>
        <Card.Description>Current month</Card.Description>
      </Card.Header>
      <Card.Content class="flex flex-1 flex-col justify-center">
        {#if loading}
          <Spinner class="mt-1 size-8" />
        {:else}
          <p class="text-xl font-bold">{formatAmount(currentMonthTotal)}</p>
          <p class="text-sm text-muted-foreground">
            {selectedMonth ? formatMonth(selectedMonth) : '—'}
          </p>
        {/if}
      </Card.Content>
    </Card.Root>
    <Card.Root class="gap-0">
      <Card.Header>
        <Card.Description>Top category</Card.Description>
      </Card.Header>
      <Card.Content class="flex flex-1 flex-col justify-center">
        {#if loading}
          <Spinner class="mt-1 size-8" />
        {:else if topCategory}
          <div class="flex items-center gap-2">
            <CategoryIcon icon={topCategory.icon} color={topCategory.color} size="md" />
            <span class="font-bold">{topCategory.name}</span>
          </div>
        {:else}
          <p class="text-sm text-muted-foreground">—</p>
        {/if}
      </Card.Content>
    </Card.Root>

    <Card.Root class="sm:col-span-2">
      <Card.Header>
        <Card.Title class="text-base">Spending by category</Card.Title>
        <Card.Description>Breakdown for the selected month</Card.Description>
      </Card.Header>
      <Card.Content class="flex-1">
        {#if loading}
          <Skeleton class="h-56 w-full" />
        {:else if pieDataFiltered.length === 0}
          <div
            class="flex h-full min-h-48 items-center justify-center text-sm text-muted-foreground"
          >
            No data for this month
          </div>
        {:else}
          {@const pieConfig = Object.fromEntries(
            pieDataFiltered.map((d) => [d.key, { label: d.key, color: d.color }])
          )}
          <Chart.Container config={pieConfig} class="max-h-96 min-h-56 w-full pb-2">
            <PieChart
              data={pieDataFiltered}
              key="key"
              value="value"
              c={(d) => d.color}
              innerRadius={-30}
              outerRadius={120}
              cornerRadius={4}
              padAngle={0.02}
              legend={false}
              cRange={pieDataFiltered.map((d) => d.color)}
              props={{
                pie: { motion: { type: 'tween', duration: 800, easing: cubicInOut } }
              }}
            >
              {#snippet aboveMarks()}
                <Text
                  value={formatAmount(pieTotal)}
                  textAnchor="middle"
                  verticalAnchor="middle"
                  class="fill-foreground text-lg! font-semibold"
                  dy={-6}
                />
                <Text
                  value="total"
                  textAnchor="middle"
                  verticalAnchor="middle"
                  class="fill-muted-foreground text-xs"
                  dy={12}
                />
              {/snippet}
              {#snippet tooltip()}
                <Chart.Tooltip />
              {/snippet}
            </PieChart>
          </Chart.Container>
        {/if}
        {#if !loading}
          <div class="mt-4 flex flex-wrap gap-1.5">
            {#each categoryTotals as cat (cat.categoryId)}
              <Button
                variant="outline"
                size="sm"
                class="rounded-full"
                style={selectedPieCategories.has(cat.categoryId)
                  ? `background-color: ${cat.color}; color: ${readableColor(cat.color)}; border-color: ${cat.color}`
                  : `border-color: ${cat.color}40; color: ${cat.color}`}
                onclick={() => {
                  const next = new Set(selectedPieCategories);
                  if (next.has(cat.categoryId)) next.delete(cat.categoryId);
                  else next.add(cat.categoryId);
                  selectedPieCategories = next;
                }}
              >
                <IconDisplay name={cat.icon ?? undefined} class="mr-1 shrink-0" />
                {cat.name}
              </Button>
            {/each}
            {#if selectedPieCategories.size > 0}
              <Button
                variant="outline"
                size="sm"
                class="rounded-full text-muted-foreground"
                onclick={() => (selectedPieCategories = new Set())}
              >
                Reset
              </Button>
            {/if}
          </div>
        {/if}
      </Card.Content>
    </Card.Root>

    <Card.Root class="sm:col-span-2">
      <Card.Header>
        <Card.Title class="text-base">Monthly spending trend</Card.Title>
        <Card.Description>Total expenses by month</Card.Description>
        <Card.Action>
          <div class="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={loading || yearOptions.indexOf(Number(selectedAreaYear)) <= 0}
              onclick={() => {
                const idx = yearOptions.indexOf(Number(selectedAreaYear));
                if (idx > 0) selectedAreaYear = String(yearOptions[idx - 1]);
              }}
              aria-label="Previous year"
            >
              <ChevronLeft class="size-4" />
            </Button>
            <Select.Root
              type="single"
              value={selectedAreaYear}
              onValueChange={(v) => (selectedAreaYear = v ?? selectedAreaYear)}
              disabled={loading}
            >
              <Select.Trigger size="sm" class="w-22">
                {selectedAreaYear || '—'}
              </Select.Trigger>
              <Select.Content>
                {#each yearOptions as y}
                  <Select.Item value={String(y)} label={String(y)}>{y}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={loading ||
                yearOptions.indexOf(Number(selectedAreaYear)) >= yearOptions.length - 1}
              onclick={() => {
                const idx = yearOptions.indexOf(Number(selectedAreaYear));
                if (idx < yearOptions.length - 1) selectedAreaYear = String(yearOptions[idx + 1]);
              }}
              aria-label="Next year"
            >
              <ChevronRight class="size-4" />
            </Button>
          </div>
        </Card.Action>
      </Card.Header>
      <Card.Content class="flex-1">
        {#if loading}
          <Skeleton class="h-56 w-full" />
        {:else if areaChartData.length === 0}
          <div
            class="flex h-full min-h-48 items-center justify-center text-sm text-muted-foreground"
          >
            No data
          </div>
        {:else}
          {@const chartConfig = { total: { label: 'Expenses', color: 'var(--chart-1)' } }}
          <Chart.Container config={chartConfig} class="max-h-96 min-h-56 w-full pb-2">
            <AreaChart
              data={areaChartData}
              x="month"
              axis="x"
              yPadding={[10, 10]}
              series={[{ key: 'total', label: 'Expenses ₽', color: 'var(--chart-1)' }]}
              props={{
                area: {
                  curve: curveCatmullRom.alpha(0.5),
                  fillOpacity: 0.4,
                  line: { class: 'stroke-1' },
                  motion: 'tween'
                },
                xAxis: {
                  format: (d: string) => formatMonthShort(d),
                  tickLabelProps: { rotate: -45, textAnchor: 'end', dy: 4 }
                }
              }}
            >
              {#snippet marks({ series, getAreaProps })}
                <defs>
                  <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stop-color="var(--color-total)" stop-opacity={1} />
                    <stop offset="95%" stop-color="var(--color-total)" stop-opacity={0.1} />
                  </linearGradient>
                </defs>
                <ChartClipPath
                  initialWidth={0}
                  motion={{
                    width: { type: 'tween', duration: 1000, easing: cubicInOut }
                  }}
                >
                  {#each series as s, i (s.key)}
                    <Area {...getAreaProps(s, i)} fill="url(#fillExpenses)" />
                  {/each}
                </ChartClipPath>
              {/snippet}
              {#snippet tooltip()}
                <Chart.Tooltip
                  labelKey="month"
                  labelFormatter={(value, payload) => {
                    const month =
                      payload?.[0]?.payload?.month ??
                      payload?.[0]?.payload?.payload?.month ??
                      value;
                    if (typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
                      return formatMonthChart(month);
                    }
                    return value != null ? String(value) : '';
                  }}
                />
              {/snippet}
            </AreaChart>
          </Chart.Container>
        {/if}
      </Card.Content>
    </Card.Root>

    <Card.Root class="sm:col-span-2">
      <Card.Header>
        <Card.Title class="text-base">Spending by category per month</Card.Title>
        <Card.Description>Category breakdown by month</Card.Description>
        <Card.Action>
          <div class="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={loading || yearOptions.indexOf(Number(selectedBarYear)) <= 0}
              onclick={() => {
                const idx = yearOptions.indexOf(Number(selectedBarYear));
                if (idx > 0) selectedBarYear = String(yearOptions[idx - 1]);
              }}
              aria-label="Previous year"
            >
              <ChevronLeft class="size-4" />
            </Button>
            <Select.Root
              type="single"
              value={selectedBarYear}
              onValueChange={(v) => (selectedBarYear = v ?? selectedBarYear)}
              disabled={loading}
            >
              <Select.Trigger size="sm" class="w-22">
                {selectedBarYear || '—'}
              </Select.Trigger>
              <Select.Content>
                {#each yearOptions as y}
                  <Select.Item value={String(y)} label={String(y)}>{y}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={loading ||
                yearOptions.indexOf(Number(selectedBarYear)) >= yearOptions.length - 1}
              onclick={() => {
                const idx = yearOptions.indexOf(Number(selectedBarYear));
                if (idx < yearOptions.length - 1) selectedBarYear = String(yearOptions[idx + 1]);
              }}
              aria-label="Next year"
            >
              <ChevronRight class="size-4" />
            </Button>
          </div>
        </Card.Action>
      </Card.Header>
      <Card.Content>
        {#if loading}
          <Skeleton class="h-56 w-full" />
        {:else if barChartData.length === 0}
          <div
            class="flex h-full min-h-48 items-center justify-center text-sm text-muted-foreground"
          >
            No data
          </div>
        {:else}
          {@const barConfig = Object.fromEntries(
            barSeries.map((s) => [s.key, { label: s.label, color: s.color }])
          )}
          <Chart.Container config={barConfig} class="max-h-96 min-h-56 w-full pb-2">
            <BarChart
              data={barChartData}
              x="month"
              axis="x"
              seriesLayout="stack"
              series={barSeries}
              yPadding={[0, 10]}
              props={{
                xAxis: {
                  format: (d: string) => formatMonthShort(d),
                  tickLabelProps: { rotate: -45, textAnchor: 'end', dy: 4 }
                },
                bars: {
                  stroke: 'none',
                  initialHeight: 0,
                  initialY: 0,
                  motion: { type: 'tween', duration: 600, easing: cubicInOut }
                }
              }}
            >
              {#snippet tooltip()}
                <Chart.Tooltip
                  labelKey="month"
                  labelFormatter={(value, payload) => {
                    const month =
                      payload?.[0]?.payload?.month ??
                      payload?.[0]?.payload?.payload?.month ??
                      value;
                    if (typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
                      return formatMonthChart(month);
                    }
                    return value != null ? String(value) : '';
                  }}
                />
              {/snippet}
            </BarChart>
          </Chart.Container>
        {/if}
        {#if !loading}
          <div class="mt-4 flex flex-wrap gap-1.5">
            {#each categories as cat (cat.id)}
              <Button
                variant="outline"
                size="sm"
                class="rounded-full"
                style={selectedBarCategories.has(cat.id)
                  ? `background-color: ${cat.color}; color: ${readableColor(cat.color)}; border-color: ${cat.color}`
                  : `border-color: ${cat.color}40; color: ${cat.color}`}
                onclick={() => {
                  const next = new Set(selectedBarCategories);
                  if (next.has(cat.id)) next.delete(cat.id);
                  else next.add(cat.id);
                  selectedBarCategories = next;
                }}
              >
                <IconDisplay name={cat.icon ?? undefined} class="mr-1 shrink-0" />
                {cat.name}
              </Button>
            {/each}
            {#if selectedBarCategories.size > 0}
              <Button
                variant="outline"
                size="sm"
                class="rounded-full text-muted-foreground"
                onclick={() => (selectedBarCategories = new Set())}
              >
                Reset
              </Button>
            {/if}
          </div>
        {/if}
      </Card.Content>
    </Card.Root>

    <Card.Root class="gap-0 border-dashed">
      <Card.Header>
        <Card.Description>Total spent (all time)</Card.Description>
      </Card.Header>
      <Card.Content class="flex flex-1 flex-col justify-center">
        {#if loading}
          <Spinner class="mt-1 size-8" />
        {:else}
          <p class="text-xl font-bold">{formatAmount(totalAllTime)}</p>
        {/if}
      </Card.Content>
    </Card.Root>
    <Card.Root class="gap-0 border-dashed">
      <Card.Header>
        <Card.Description>Monthly average</Card.Description>
      </Card.Header>
      <Card.Content class="flex flex-1 flex-col justify-center">
        {#if loading}
          <Spinner class="mt-1 size-8" />
        {:else}
          <p class="text-xl font-bold">{formatAmount(Math.round(avgMonthly))}</p>
        {/if}
      </Card.Content>
    </Card.Root>
  </div>
</div>
