import React from 'react';
import ReactECharts from 'echarts-for-react';

/**
 * CoalSetu — Production & Offtake Analytics Chart (Apache ECharts)
 * Rich interactive bar & line combo chart for CIL subsidiaries.
 */
export default function ProductionEChart({ data }) {
  // Default CIL Subsidiary data if not provided
  const chartData = data || [
    { subsidiary: 'ECL', target: 35.0, actual: 33.2, offtake: 32.8, obr: 62.4 },
    { subsidiary: 'BCCL', target: 41.0, actual: 40.1, offtake: 39.5, obr: 58.2 },
    { subsidiary: 'CCL', target: 84.0, actual: 81.5, offtake: 80.2, obr: 110.5 },
    { subsidiary: 'NCL', target: 135.0, actual: 136.2, offtake: 135.8, obr: 410.0 },
    { subsidiary: 'WCL', target: 65.0, actual: 64.3, offtake: 63.9, obr: 195.4 },
    { subsidiary: 'SECL', target: 167.0, actual: 161.8, offtake: 160.5, obr: 245.0 },
    { subsidiary: 'MCL', target: 193.0, actual: 195.4, offtake: 194.2, obr: 220.1 },
  ];

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', crossStyle: { color: '#999' } },
      backgroundColor: '#1a3c6b',
      textStyle: { color: '#fff', fontSize: 12 },
      borderWidth: 0,
      formatter: function (params) {
        let res = `<strong>${params[0].name} (CIL Subsidiary)</strong><br/>`;
        params.forEach(p => {
          const unit = p.seriesName === 'OBR Removal' ? ' M.Cu.m' : ' MT';
          res += `${p.marker} ${p.seriesName}: <strong>${p.value}${unit}</strong><br/>`;
        });
        return res;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '18%',
      containLabel: true
    },
    legend: {
      data: ['Target (MT)', 'Actual Production (MT)', 'Coal Offtake (MT)', 'OBR Removal'],
      top: '2%',
      textStyle: { color: '#334155', fontSize: 11 }
    },
    xAxis: [
      {
        type: 'category',
        data: chartData.map(d => d.subsidiary),
        axisPointer: { type: 'shadow' },
        axisLabel: { color: '#475569', fontWeight: 'bold' }
      }
    ],
    yAxis: [
      {
        type: 'value',
        name: 'Production & Offtake (MT)',
        min: 0,
        axisLabel: { formatter: '{value} MT' },
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } }
      },
      {
        type: 'value',
        name: 'OBR (M.Cu.m)',
        min: 0,
        axisLabel: { formatter: '{value}' },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: 'Target (MT)',
        type: 'bar',
        barGap: '20%',
        itemStyle: { color: '#94a3b8', borderRadius: [4, 4, 0, 0] },
        data: chartData.map(d => d.target)
      },
      {
        name: 'Actual Production (MT)',
        type: 'bar',
        itemStyle: { color: '#1a3c6b', borderRadius: [4, 4, 0, 0] },
        data: chartData.map(d => d.actual)
      },
      {
        name: 'Coal Offtake (MT)',
        type: 'bar',
        itemStyle: { color: '#059669', borderRadius: [4, 4, 0, 0] },
        data: chartData.map(d => d.offtake)
      },
      {
        name: 'OBR Removal',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbolSize: 8,
        lineStyle: { width: 3, color: '#d97706' },
        itemStyle: { color: '#d97706' },
        data: chartData.map(d => d.obr)
      }
    ]
  };

  return (
    <div className="w-full bg-white rounded-xl p-4 border border-border-subtle shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-semibold text-ink-900">
            📊 Subsidiary Production, Offtake & OBR Analytics Matrix
          </h3>
          <p className="text-xs text-ink-500">
            Interactive Apache ECharts visualization · Fiscal Performance comparison across all 7 CIL subsidiaries
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
          Apache ECharts v5
        </span>
      </div>
      <ReactECharts option={option} style={{ height: '340px', width: '100%' }} />
    </div>
  );
}
