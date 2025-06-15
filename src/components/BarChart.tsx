import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FileInfo {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
  children: FileInfo[];
}

interface BarChartData {
  name: string;
  size: number;
  path: string;
  formattedSize: string;
}

interface BarChartProps {
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

const transformData = (fileInfo: FileInfo): BarChartData[] => {
  if (!fileInfo?.children || fileInfo.children.length === 0) {
    return [];
  }

  return fileInfo.children
    .filter(child => child && child.size > 0)
    .sort((a, b) => b.size - a.size)
    .slice(0, 20)
    .map(child => ({
      name: child.name?.length > 25 ? `${child.name.substring(0, 25)}...` : (child.name || 'Unknown'),
      size: child.size || 0,
      path: child.path || '',
      formattedSize: formatBytes(child.size || 0),
    }));
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border">
        <p className="font-semibold text-slate-900 dark:text-slate-100">
          {label}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Size: {data.formattedSize}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-500 max-w-xs truncate">
          {data.path}
        </p>
      </div>
    );
  }
  return null;
};

const CustomXAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const name = payload.value;
  const maxLength = 15;
  const displayName = name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
  
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="middle"
        fill="currentColor"
        className="text-xs fill-slate-600 dark:fill-slate-400"
        transform="rotate(-45)"
      >
        {displayName}
      </text>
    </g>
  );
};

export const BarChart: React.FC<BarChartProps> = React.memo(({ data, onNodeClick }) => {
  const barData = React.useMemo(() => transformData(data), [data]);

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
        <RechartsBarChart
          data={barData}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="name"
            tick={<CustomXAxisTick />}
            height={80}
            interval={0}
          />
          <YAxis
            tickFormatter={formatBytes}
            className="text-xs fill-slate-600 dark:fill-slate-400"
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="size"
            onClick={onNodeClick}
            cursor="pointer"
          >
            {barData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
});