<script lang="ts">
  import * as Chart from '$lib/components/ui/chart';
  import { BarChart, AreaChart } from 'layerchart';

  const chartData = [
    { month: 'January', desktop: 186, mobile: 80 },
    { month: 'February', desktop: 305, mobile: 200 },
    { month: 'March', desktop: 237, mobile: 120 },
    { month: 'April', desktop: 73, mobile: 190 },
    { month: 'May', desktop: 209, mobile: 130 },
    { month: 'June', desktop: 214, mobile: 140 }
  ];

  const chartConfig = {
    desktop: {
      label: 'Desktop',
      color: 'var(--chart-1)'
    },
    mobile: {
      label: 'Mobile',
      color: 'var(--chart-2)'
    }
  } satisfies Chart.ChartConfig;
</script>

<div class="grid gap-6 md:grid-cols-2">
  <div class="space-y-4">
    <h3 class="text-lg font-medium">Bar Chart</h3>
    <Chart.Container config={chartConfig} class="min-h-[300px] w-full rounded-xl border p-4">
      <BarChart
        data={chartData}
        x="month"
        axis="x"
        seriesLayout="group"
        legend
        series={[
          {
            key: 'desktop',
            label: chartConfig.desktop.label,
            color: chartConfig.desktop.color
          },
          {
            key: 'mobile',
            label: chartConfig.mobile.label,
            color: chartConfig.mobile.color
          }
        ]}
        props={{
          xAxis: {
            format: (d) => d.slice(0, 3)
          }
        }}
      >
        {#snippet tooltip()}
          <Chart.Tooltip />
        {/snippet}
      </BarChart>
    </Chart.Container>
  </div>

  <div class="space-y-4">
    <h3 class="text-lg font-medium">Area Chart</h3>
    <Chart.Container config={chartConfig} class="min-h-[300px] w-full rounded-xl border p-4">
      <AreaChart
        data={chartData}
        x="month"
        axis="x"
        series={[
          {
            key: 'desktop',
            label: chartConfig.desktop.label,
            color: chartConfig.desktop.color
          },
          {
            key: 'mobile',
            label: chartConfig.mobile.label,
            color: chartConfig.mobile.color
          }
        ]}
        props={{
          xAxis: {
            format: (d) => d.slice(0, 3)
          }
        }}
      >
        {#snippet tooltip()}
          <Chart.Tooltip />
        {/snippet}
      </AreaChart>
    </Chart.Container>
  </div>
</div>
