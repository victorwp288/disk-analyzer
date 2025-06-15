import React from 'react';
import { Treemap, ResponsiveContainer, Cell } from 'recharts';

interface FileInfo {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
  children: FileInfo[];
}

interface TreemapData {
  name: string;
  size: number;
  path: string;
  children?: TreemapData[];
}

interface TreemapChartProps {
  data: FileInfo;
  onNodeClick?: (data: any) => void;
}

const colors = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#87d068', '#ffa500', '#ff6b6b', '#4ecdc4'
];

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const transformData = (fileInfo: FileInfo): TreemapData[] => {
  if (!fileInfo.children || fileInfo.children.length === 0) {
    return [{
      name: fileInfo.name,
      size: fileInfo.size,
      path: fileInfo.path,
    }];
  }

  return fileInfo.children
    .filter(child => child.size > 0)
    .sort((a, b) => b.size - a.size)
    .slice(0, 20) // Limit to top 20 items for better visualization
    .map(child => ({
      name: child.name,
      size: child.size,
      path: child.path,
      children: child.is_dir && child.children.length > 0 ? transformData(child) : undefined,
    }));
};

const CustomizedContent = (props: any) => {
  const { root, depth, x, y, width, height, index, name, size } = props;
  
  if (width < 20 || height < 20) return null;
  
  const color = colors[index % colors.length];
  const textColor = depth <= 2 ? '#fff' : '#000';
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: color,
          stroke: '#fff',
          strokeWidth: depth === 0 ? 0 : 1,
          opacity: depth === 0 ? 1 : 0.8,
        }}
      />
      {width > 50 && height > 30 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 8}
            textAnchor="middle"
            fill={textColor}
            fontSize={Math.min(12, width / 8, height / 4)}
            fontWeight="bold"
          >
            {name.length > 15 ? `${name.substring(0, 15)}...` : name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 8}
            textAnchor="middle"
            fill={textColor}
            fontSize={Math.min(10, width / 10, height / 6)}
          >
            {formatBytes(size)}
          </text>
        </>
      )}
    </g>
  );
};

export const TreemapChart: React.FC<TreemapChartProps> = ({ data, onNodeClick }) => {
  const treemapData = transformData(data);

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={treemapData}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="#fff"
          content={<CustomizedContent />}
          onClick={onNodeClick}
        />
      </ResponsiveContainer>
    </div>
  );
};