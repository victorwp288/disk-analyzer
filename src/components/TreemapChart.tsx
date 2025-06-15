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
  if (!fileInfo?.children || fileInfo.children.length === 0) {
    return [{
      name: fileInfo?.name || 'Unknown',
      size: fileInfo?.size || 0,
      path: fileInfo?.path || '',
    }];
  }

  return fileInfo.children
    .filter(child => child && child.size > 0)
    .sort((a, b) => b.size - a.size)
    .slice(0, 15) // Reduce to top 15 for better performance
    .map(child => ({
      name: child.name || 'Unknown',
      size: child.size || 0,
      path: child.path || '',
      // Don't include nested children to prevent deep recursion
      children: undefined,
    }));
};

const CustomizedContent = (props: any) => {
  const { root, depth, x, y, width, height, index, name, size } = props;
  
  if (width < 30 || height < 20) return null;
  
  const color = colors[index % colors.length];
  const textColor = '#fff';
  const fontSize = Math.max(10, Math.min(14, width / 12, height / 4));
  const smallFontSize = Math.max(8, Math.min(11, width / 15, height / 6));
  
  return (
    <g className="hover:opacity-90 transition-opacity cursor-pointer">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: color,
          stroke: '#fff',
          strokeWidth: 2,
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
        }}
        className="hover:brightness-110 transition-all"
      />
      {width > 60 && height > 40 && (
        <>
          {/* Background for text readability */}
          <rect
            x={x + 4}
            y={y + height / 2 - fontSize}
            width={width - 8}
            height={fontSize * 2 + 4}
            fill="rgba(0,0,0,0.2)"
            rx="2"
          />
          <text
            x={x + width / 2}
            y={y + height / 2 - 2}
            textAnchor="middle"
            fill={textColor}
            fontSize={fontSize}
            fontWeight="600"
            style={{ 
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          >
            {name && name.length > 20 ? `${name.substring(0, 20)}...` : (name || '')}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + smallFontSize + 2}
            textAnchor="middle"
            fill={textColor}
            fontSize={smallFontSize}
            fontWeight="500"
            style={{ 
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, monospace'
            }}
          >
            {formatBytes(size)}
          </text>
        </>
      )}
    </g>
  );
};

export const TreemapChart: React.FC<TreemapChartProps> = React.memo(({ data, onNodeClick }) => {
  const treemapData = React.useMemo(() => transformData(data), [data]);

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
});