import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StatsChartProps {
  data: { timestamp: number; wpm: number }[];
}

const StatsChart: React.FC<StatsChartProps> = ({ data }) => {
  if (data.length < 2) return null;

  const chartData = data.map((d, i) => ({
    name: i + 1,
    wpm: Math.round(d.wpm),
  }));

  return (
    <div className="w-full h-64 mt-6">
      <h3 className="text-sm font-mono text-zen-dim mb-4">WPM PROGRESSION</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis dataKey="name" stroke="#6B7280" tick={{fontSize: 12}} />
          <YAxis stroke="#6B7280" tick={{fontSize: 12}} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1E1E1E', borderColor: '#374151', color: '#E5E7EB' }}
            itemStyle={{ color: '#10B981' }}
          />
          <Area type="monotone" dataKey="wpm" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StatsChart;