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
  if (!fileInfo.children || fileInfo.children.length === 0) {
    return [];
  }

  return fileInfo.children
    .filter(child => child.size > 0)
    .sort((a, b) => b.size - a.size)
    .slice(0, level === 0 ? 10 : 8) // Limit items per level
    .map((child, index) => ({
      name: child.name,
      value: child.size,
      path: child.path,
      level,
      color: colors[(level * 10 + index) % colors.length],
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
  const percentage = ((value / 1073741824) * 100).toFixed(1); // Using demo total for now

  // Only show label if the segment is large enough
  if (outerRadius - innerRadius < 20) return null;

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize="12"
      fontWeight="bold"
    >
      {name.length > 8 ? `${name.substring(0, 8)}...` : name}
    </text>
  );
};

export const SunburstChart: React.FC<SunburstChartProps> = ({ data, onNodeClick }) => {
  const level0Data = transformDataForSunburst(data, 0);
  const level1Data = data.children?.flatMap(child => 
    transformDataForSunburst(child, 1)
  ) || [];

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
            outerRadius={180}
            innerRadius={120}
            fill="#8884d8"
            dataKey="value"
            onClick={onNodeClick}
          >
            {level1Data.map((entry, index) => (
              <Cell key={`level1-cell-${index}`} fill={entry.color} />
            ))}
          </Pie>

          {/* Inner ring - Level 0 (main directories) */}
          <Pie
            data={level0Data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={120}
            innerRadius={60}
            fill="#82ca9d"
            dataKey="value"
            onClick={onNodeClick}
          >
            {level0Data.map((entry, index) => (
              <Cell key={`level0-cell-${index}`} fill={entry.color} />
            ))}
          </Pie>

          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};