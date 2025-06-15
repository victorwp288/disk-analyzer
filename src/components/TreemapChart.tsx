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
  onContextMenu?: (data: any, event: React.MouseEvent) => void;
}

const colors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
  '#14b8a6', '#eab308', '#f43f5e', '#8b5cf6', '#22c55e'
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
  const { root, depth, x, y, width, height, index, name, size, payload } = props;
  
  if (width < 40 || height < 30) return null;
  
  const baseColor = colors[index % colors.length];
  const isSmall = width < 120 || height < 60;
  const fontSize = isSmall ? Math.max(10, Math.min(12, width / 10)) : Math.max(12, Math.min(16, width / 15));
  const sizeTextSize = isSmall ? Math.max(8, Math.min(10, width / 12)) : Math.max(10, Math.min(13, width / 18));
  
  // Create a subtle gradient effect
  const gradientId = `gradient-${index}`;
  
  return (
    <g className="group cursor-pointer">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={baseColor} stopOpacity="1" />
          <stop offset="100%" stopColor={baseColor} stopOpacity="0.8" />
        </linearGradient>
        <filter id={`shadow-${index}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15"/>
        </filter>
      </defs>
      
      {/* Main rectangle with gradient */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={`url(#${gradientId})`}
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="1"
        rx="3"
        ry="3"
        filter={`url(#shadow-${index})`}
        className="group-hover:brightness-110 transition-all duration-200"
      />
      
      {/* Subtle inner border for depth */}
      <rect
        x={x + 1}
        y={y + 1}
        width={width - 2}
        height={height - 2}
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1"
        rx="2"
        ry="2"
      />
      
      {/* Text content */}
      {width > 50 && height > 35 && (
        <g>
          {/* File/folder name */}
          <text
            x={x + 8}
            y={y + fontSize + 8}
            fill="white"
            fontSize={fontSize}
            fontWeight="600"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            textShadow="0 1px 2px rgba(0,0,0,0.7)"
          >
            {name && name.length > (isSmall ? 12 : 20) 
              ? `${name.substring(0, isSmall ? 12 : 20)}...` 
              : (name || '')
            }
          </text>
          
          {/* Size information */}
          {height > 50 && (
            <text
              x={x + 8}
              y={y + fontSize + sizeTextSize + 16}
              fill="rgba(255,255,255,0.9)"
              fontSize={sizeTextSize}
              fontWeight="500"
              fontFamily="ui-monospace, SFMono-Regular, 'SF Mono', Consolas, monospace"
              textShadow="0 1px 2px rgba(0,0,0,0.7)"
            >
              {formatBytes(size)}
            </text>
          )}
          
          {/* Optional percentage or additional info for larger blocks */}
          {width > 150 && height > 80 && (
            <text
              x={x + width - 8}
              y={y + height - 8}
              fill="rgba(255,255,255,0.7)"
              fontSize="10"
              fontWeight="400"
              textAnchor="end"
              fontFamily="ui-monospace, SFMono-Regular, 'SF Mono', Consolas, monospace"
              textShadow="0 1px 2px rgba(0,0,0,0.7)"
            >
              #{index + 1}
            </text>
          )}
        </g>
      )}
    </g>
  );
};

export const TreemapChart: React.FC<TreemapChartProps> = React.memo(({ data, onNodeClick, onContextMenu }) => {
  const treemapData = React.useMemo(() => transformData(data), [data]);

  const handleTreemapClick = (data: any) => {
    if (onNodeClick) {
      // Find the original file data
      const findFileData = (fileInfo: FileInfo, targetName: string): FileInfo | null => {
        if (fileInfo.name === targetName) return fileInfo;
        for (const child of fileInfo.children || []) {
          const found = findFileData(child, targetName);
          if (found) return found;
        }
        return null;
      };
      
      const fileData = findFileData(data, data.name);
      onNodeClick(fileData || data);
    }
  };

  if (!data) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-slate-500">No data to display</div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full p-2"
      onContextMenu={(e) => {
        e.preventDefault();
        if (onContextMenu && data) {
          onContextMenu(data, e);
        }
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={treemapData}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="none"
          content={<CustomizedContent />}
          onClick={handleTreemapClick}
          animationDuration={500}
          isAnimationActive={true}
        />
      </ResponsiveContainer>
    </div>
  );
});