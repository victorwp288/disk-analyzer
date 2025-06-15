import React, { useEffect, useRef } from 'react';
import { FolderOpen, Trash2, Copy, Info } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  onClose: () => void;
  onOpenInExplorer: () => void;
  onDelete: () => void;
  onCopyPath: () => void;
  onShowInfo: () => void;
  fileName: string;
  isDirectory: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  visible,
  onClose,
  onOpenInExplorer,
  onDelete,
  onCopyPath,
  onShowInfo,
  fileName,
  isDirectory,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  const menuItems = [
    {
      label: `Open ${isDirectory ? 'folder' : 'file'} in explorer`,
      icon: <FolderOpen className="h-4 w-4" />,
      onClick: onOpenInExplorer,
    },
    {
      label: 'Copy path',
      icon: <Copy className="h-4 w-4" />,
      onClick: onCopyPath,
    },
    {
      label: 'Properties',
      icon: <Info className="h-4 w-4" />,
      onClick: onShowInfo,
    },
    {
      label: `Delete ${isDirectory ? 'folder' : 'file'}`,
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDelete,
      dangerous: true,
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-2 min-w-[200px]"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
          {fileName}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {isDirectory ? 'Folder' : 'File'}
        </p>
      </div>
      
      {menuItems.map((item, index) => (
        <button
          key={index}
          className={`w-full flex items-center space-x-3 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
            item.dangerous
              ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
              : 'text-slate-700 dark:text-slate-300'
          }`}
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          <span className={item.dangerous ? 'text-red-500' : 'text-slate-500'}>
            {item.icon}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};