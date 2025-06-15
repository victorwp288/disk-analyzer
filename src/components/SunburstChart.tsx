import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface FileInfo {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
  children: FileInfo[];
}

interface SunburstData {
  name: string;
  value: number;
  path: string;
  level: number;
  color: string;
}

interface SunburstChartProps {
  data: FileInfo;
  onNodeClick?: (data: any) => void;
}

const colors = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#87d068', '#ffa500', '#ff6b6b', '#4ecdc4',
  '#a4de6c', '#ffc0cb', '#ffb347', '#dda0dd', '#98fb98'
];

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const transformDataForSunburst = (fileInfo: FileInfo, level: number = 0): SunburstData[] => {
  if (!fileInfo?.children || fileInfo.children.length === 0) {
    return [];
  }

  return fileInfo.children
    .filter(child => child && child.size > 0)
    .sort((a, b) => b.size - a.size)
    .slice(0, level === 0 ? 8 : 6) // Reduce items per level for performance
    .map((child, index) => ({
      name: child.name || 'Unknown',
      value: child.size || 0,
      path: child.path || '',
      level,
      color: colors[(level * 8 + index) % colors.length],
    }));
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border">
        <p className="font-semibold text-slate-900 dark:text-slate-100">
          {data.name}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Size: {formatBytes(data.value)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-500">
          {data.path}
        </p>
      </div>
    );
  }
  return null;
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, name }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Only show label if the segment is large enough
  if (outerRadius - innerRadius < 30) return null;

  const displayName = name && name.length > 10 ? `${name.substring(0, 10)}...` : (name || '');

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize="13"
      fontWeight="600"
      style={{ 
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {displayName}
    </text>
  );
};

export const SunburstChart: React.FC<SunburstChartProps> = React.memo(({ data, onNodeClick }) => {
  const level0Data = React.useMemo(() => transformDataForSunburst(data, 0), [data]);
  const level1Data = React.useMemo(() => 
    data?.children?.flatMap(child => transformDataForSunburst(child, 1)) || []
  , [data]);

  if (!data) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-slate-500">No data to display</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* Outer ring - Level 1 (subdirectories) */}
          <Pie
            data={level1Data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius="85%"
            innerRadius="55%"
            fill="#8884d8"
            dataKey="value"
            onClick={onNodeClick}
            animationBegin={0}
            animationDuration={800}
          >
            {level1Data.map((entry, index) => (
              <Cell 
                key={`level1-cell-${index}`} 
                fill={entry.color}
                stroke="#fff"
                strokeWidth={2}
                className="hover:opacity-80 transition-opacity cursor-pointer"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
              />
            ))}
          </Pie>

          {/* Inner ring - Level 0 (main directories) */}
          <Pie
            data={level0Data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius="55%"
            innerRadius="20%"
            fill="#82ca9d"
            dataKey="value"
            onClick={onNodeClick}
            animationBegin={200}
            animationDuration={800}
          >
            {level0Data.map((entry, index) => (
              <Cell 
                key={`level0-cell-${index}`} 
                fill={entry.color}
                stroke="#fff"
                strokeWidth={3}
                className="hover:opacity-80 transition-opacity cursor-pointer"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
              />
            ))}
          </Pie>

          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});