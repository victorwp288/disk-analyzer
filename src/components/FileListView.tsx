import React from 'react';
import { ChevronRight, File, Folder, MoreVertical } from 'lucide-react';
import { Button } from './ui/button';

interface FileInfo {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
  children: FileInfo[];
}

interface FileListViewProps {
  data: FileInfo;
  onNodeClick?: (data: any) => void;
  onContextMenu?: (data: any, event: React.MouseEvent) => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const FileRow: React.FC<{
  file: FileInfo;
  depth: number;
  onNodeClick?: (data: any) => void;
  onContextMenu?: (data: any, event: React.MouseEvent) => void;
}> = ({ file, depth, onNodeClick, onContextMenu }) => {
  const [expanded, setExpanded] = React.useState(depth < 2);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu?.(file, e);
  };

  const sizePercentage = ((file.size / 1073741824) * 100).toFixed(1); // Rough percentage

  return (
    <>
      <div
        className="flex items-center py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer group border-b border-slate-100 dark:border-slate-700"
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
        onClick={() => onNodeClick?.(file)}
        onContextMenu={handleContextMenu}
      >
        <div className="flex items-center flex-1 min-w-0">
          {file.is_dir && file.children.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-4 w-4 mr-2"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              <ChevronRight
                className={`h-3 w-3 transition-transform ${
                  expanded ? 'rotate-90' : ''
                }`}
              />
            </Button>
          )}
          {!file.is_dir || file.children.length === 0 ? (
            <div className="w-4 mr-2" />
          ) : null}
          
          {file.is_dir ? (
            <Folder className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" />
          ) : (
            <File className="h-4 w-4 mr-2 text-slate-500 flex-shrink-0" />
          )}
          
          <span className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">
            {file.name}
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 min-w-0">
            <div className="bg-slate-200 dark:bg-slate-600 rounded-full h-2 w-20">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(parseFloat(sizePercentage), 100)}%` }}
              />
            </div>
          </div>
          
          <span className="text-sm text-slate-600 dark:text-slate-300 font-mono min-w-0 text-right">
            {formatBytes(file.size)}
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 p-0 h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              handleContextMenu(e);
            }}
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {expanded && file.is_dir && file.children.length > 0 && (
        <>
          {file.children
            .sort((a, b) => b.size - a.size)
            .slice(0, 20)
            .map((child, index) => (
              <FileRow
                key={`${child.path}-${index}`}
                file={child}
                depth={depth + 1}
                onNodeClick={onNodeClick}
                onContextMenu={onContextMenu}
              />
            ))}
        </>
      )}
    </>
  );
};

export const FileListView: React.FC<FileListViewProps> = React.memo(({ data, onNodeClick, onContextMenu }) => {
  if (!data) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-slate-500">No data to display</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto">
      <div className="min-w-full">
        {/* Header */}
        <div className="flex items-center py-3 px-3 bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-600">
          <div className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Name
          </div>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 w-20 text-center">
            Usage
          </div>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-0 text-right mr-6">
            Size
          </div>
        </div>
        
        {/* File rows */}
        <FileRow
          file={data}
          depth={0}
          onNodeClick={onNodeClick}
          onContextMenu={onContextMenu}
        />
      </div>
    </div>
  );
});