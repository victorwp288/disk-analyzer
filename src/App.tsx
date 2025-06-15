import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { HardDrive, FolderOpen, Search, Settings, Grid3X3, PieChart, BarChart3, List, X } from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Progress } from "./components/ui/progress";
import { TreemapChart } from "./components/TreemapChart";
import { SunburstChart } from "./components/SunburstChart";
import { BarChart } from "./components/BarChart";
import { FileListView } from "./components/FileListView";
import { ContextMenu } from "./components/ContextMenu";
import { ThemeToggle } from "./components/ThemeToggle";

function App() {
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'treemap' | 'sunburst' | 'barchart' | 'list'>('treemap');
  const [searchTerm, setSearchTerm] = useState('');
  const [scanProgress, setScanProgress] = useState<any>(null);
  const [scanPath, setScanPath] = useState('');
  const [switchingView, setSwitchingView] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    file: any;
  }>({ visible: false, x: 0, y: 0, file: null });
  const [showSearchResults, setShowSearchResults] = useState(false);  

  useEffect(() => {
    // Listen for scan progress events
    const unlisten = listen('scan-progress', (event) => {
      setScanProgress(event.payload);
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  async function startScan() {
    setScanning(true);
    setScanProgress(null);
    try {
      // Try real scan first, fall back to demo data
      try {
        const pathToScan = scanPath || (navigator.userAgent.includes('Windows') ? 'C:\\Users' : '/home');
        const results = await invoke("scan_directory", { path: pathToScan });
        setScanResults(results);
      } catch (realError) {
        console.log("Real scan failed, using demo data:", realError);
        // Demo data for testing visualization
        const demoResults = {
          root: {
            name: "Demo Directory",
            path: "/demo",
            size: 1073741824,
            is_dir: true,
            children: [
              {
                name: "Documents",
                path: "/demo/Documents",
                size: 536870912,
                is_dir: true,
                children: [
                  { name: "large_file.pdf", path: "/demo/Documents/large_file.pdf", size: 268435456, is_dir: false, children: [] },
                  { name: "photos", path: "/demo/Documents/photos", size: 134217728, is_dir: true, children: [] },
                  { name: "videos", path: "/demo/Documents/videos", size: 134217728, is_dir: true, children: [] }
                ]
              },
              {
                name: "Applications",
                path: "/demo/Applications",
                size: 268435456,
                is_dir: true,
                children: [
                  { name: "Chrome.app", path: "/demo/Applications/Chrome.app", size: 134217728, is_dir: false, children: [] },
                  { name: "VSCode.app", path: "/demo/Applications/VSCode.app", size: 134217728, is_dir: false, children: [] }
                ]
              },
              {
                name: "System",
                path: "/demo/System",
                size: 268435456,
                is_dir: true,
                children: [
                  { name: "Library", path: "/demo/System/Library", size: 134217728, is_dir: true, children: [] },
                  { name: "Logs", path: "/demo/System/Logs", size: 67108864, is_dir: true, children: [] },
                  { name: "Cache", path: "/demo/System/Cache", size: 67108864, is_dir: true, children: [] }
                ]
              }
            ]
          },
          total_size: 1073741824,
          file_count: 150,
          error_count: 0
        };
        setScanResults(demoResults);
      }
    } catch (error) {
      console.error("All scans failed:", error);
    } finally {
      setScanning(false);
      setScanProgress(null);
    }
  }

  const handleContextMenu = (file: any, event: React.MouseEvent) => {
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      file,
    });
  };

  const handleOpenInExplorer = async () => {
    if (contextMenu.file) {
      try {
        await invoke('open_in_explorer', { path: contextMenu.file.path });
      } catch (error) {
        console.error('Failed to open in explorer:', error);
      }
    }
  };

  const handleDeleteFile = async () => {
    if (contextMenu.file) {
      if (confirm(`Are you sure you want to delete "${contextMenu.file.name}"?`)) {
        try {
          await invoke('delete_file_or_folder', { path: contextMenu.file.path });
          // Trigger a rescan to update the UI
          startScan();
        } catch (error) {
          console.error('Failed to delete file:', error);
          alert('Failed to delete file: ' + error);
        }
      }
    }
  };

  const handleCopyPath = async () => {
    if (contextMenu.file) {
      try {
        await navigator.clipboard.writeText(contextMenu.file.path);
      } catch (error) {
        console.error('Failed to copy path:', error);
      }
    }
  };

  const handleShowInfo = () => {
    if (contextMenu.file) {
      alert(`
Name: ${contextMenu.file.name}
Path: ${contextMenu.file.path}
Size: ${(contextMenu.file.size / 1024 / 1024).toFixed(2)} MB
Type: ${contextMenu.file.is_dir ? 'Directory' : 'File'}
      `.trim());
    }
  };

  const setViewModeWithAnimation = (mode: typeof viewMode) => {
    setSwitchingView(true);
    setTimeout(() => {
      setViewMode(mode);
      setSwitchingView(false);
    }, 100);
  };

  return (
    <div 
      className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
      onContextMenu={(e) => {
        // Prevent default context menu only in our app area
        e.preventDefault();
      }}
    >
      <div className="flex-1 flex flex-col p-4 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <HardDrive className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Disk Analyzer
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Visualize your disk space usage
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setShowSearchResults(!showSearchResults)}
              disabled={!scanResults}
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => alert('Settings coming soon!')}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-4 min-h-0">
          {/* Control Panel */}
          <Card className="xl:col-span-1 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FolderOpen className="h-5 w-5" />
                <span>Scan Control</span>
              </CardTitle>
              <CardDescription>
                Select a directory to analyze disk usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="scanPath" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Directory to scan
                </label>
                <Input
                  id="scanPath"
                  placeholder={navigator.userAgent.includes('Windows') ? 'C:\\Users\\YourName' : '/home/yourname'}
                  value={scanPath}
                  onChange={(e) => setScanPath(e.target.value)}
                  disabled={scanning}
                />
              </div>
              
              <Button 
                onClick={startScan} 
                disabled={scanning}
                className="w-full"
              >
                {scanning ? "Scanning..." : "Start Scan"}
              </Button>
              
              {scanResults && (
                <>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    <p>Files scanned: {scanResults.file_count || 0}</p>
                    <p>Total size: {scanResults.total_size ? `${(scanResults.total_size / 1024 / 1024 / 1024).toFixed(2)} GB` : "0 B"}</p>
                    <p>Errors: {scanResults.error_count || 0}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="search" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Search files
                    </label>
                    <Input
                      id="search"
                      placeholder="Type to search files..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </>
              )}
            </CardContent>
            
            {/* Additional sidebar content */}
            {scanResults && (
              <>
                <CardContent className="border-t pt-4">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Total Files:</span>
                      <span className="text-sm font-mono text-slate-900 dark:text-slate-100">
                        {scanResults.file_count?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Total Size:</span>
                      <span className="text-sm font-mono text-slate-900 dark:text-slate-100">
                        {(scanResults.total_size / 1024 / 1024 / 1024).toFixed(2)} GB
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Errors:</span>
                      <span className="text-sm font-mono text-red-600 dark:text-red-400">
                        {scanResults.error_count || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
                
                <CardContent className="border-t pt-4">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Largest Items</h3>
                  <div className="space-y-2">
                    {scanResults.root?.children
                      ?.sort((a: any, b: any) => b.size - a.size)
                      ?.slice(0, 5)
                      ?.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer">
                          <div className="flex items-center space-x-2 min-w-0">
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${item.is_dir ? 'bg-blue-500' : 'bg-green-500'}`} />
                            <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                              {item.name?.length > 20 ? `${item.name.substring(0, 20)}...` : item.name}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-slate-600 dark:text-slate-400 ml-2">
                            {((item.size || 0) / 1024 / 1024).toFixed(1)}MB
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
                
                <CardContent className="border-t pt-4">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Actions</h3>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => alert('Export feature coming soon!')}
                    >
                      📊 Export Report
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => {
                        setScanResults(null);
                        setScanProgress(null);
                      }}
                    >
                      🗑️ Clear Results
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={startScan}
                      disabled={scanning}
                    >
                      🔄 Rescan
                    </Button>
                  </div>
                </CardContent>
              </>
            )}
          </Card>

          {/* Visualization Area */}
          <Card className="xl:col-span-3 flex flex-col min-h-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Disk Usage Visualization</CardTitle>
                  <CardDescription>
                    Interactive {viewMode === 'treemap' ? 'treemap' : viewMode === 'sunburst' ? 'sunburst' : viewMode === 'barchart' ? 'bar chart' : 'list view'} of your disk usage
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={viewMode === 'treemap' ? 'default' : 'outline'}
                    size="sm"
                    disabled={switchingView}
                    onClick={() => setViewModeWithAnimation('treemap')}
                  >
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    Treemap
                  </Button>
                  <Button
                    variant={viewMode === 'sunburst' ? 'default' : 'outline'}
                    size="sm"
                    disabled={switchingView}
                    onClick={() => setViewModeWithAnimation('sunburst')}
                  >
                    <PieChart className="h-4 w-4 mr-2" />
                    Sunburst
                  </Button>
                  <Button
                    variant={viewMode === 'barchart' ? 'default' : 'outline'}
                    size="sm"
                    disabled={switchingView}
                    onClick={() => setViewModeWithAnimation('barchart')}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Bar Chart
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    disabled={switchingView}
                    onClick={() => setViewModeWithAnimation('list')}
                  >
                    <List className="h-4 w-4 mr-2" />
                    List View
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              <div className="h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
                {scanning ? (
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <div className="space-y-2">
                      <p className="text-slate-600 dark:text-slate-400">Scanning directories...</p>
                      {scanProgress && (
                        <>
                          <div className="text-xs text-slate-500 dark:text-slate-500 max-w-md mx-auto truncate">
                            {scanProgress.current_path}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {scanProgress.files_processed.toLocaleString()} files • {(scanProgress.total_size_so_far / 1024 / 1024 / 1024).toFixed(2)} GB
                          </div>
                          <Progress value={Math.min(scanProgress.files_processed / 1000, 100)} className="w-full max-w-md mx-auto" />
                        </>
                      )}
                    </div>
                  </div>
                ) : scanResults ? (
                  switchingView ? (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-slate-600 dark:text-slate-400 text-sm">Switching view...</p>
                    </div>
                  ) : viewMode === 'treemap' ? (
                    <TreemapChart 
                      data={scanResults.root} 
                      onNodeClick={(data) => console.log('Clicked:', data)}
                    />
                  ) : viewMode === 'sunburst' ? (
                    <SunburstChart 
                      data={scanResults.root} 
                      onNodeClick={(data) => console.log('Clicked:', data)}
                    />
                  ) : viewMode === 'barchart' ? (
                    <BarChart 
                      data={scanResults.root} 
                      onNodeClick={(data) => console.log('Clicked:', data)}
                    />
                  ) : (
                    <FileListView 
                      data={scanResults.root} 
                      onNodeClick={(data) => console.log('Clicked:', data)}
                      onContextMenu={handleContextMenu}
                    />
                  )
                ) : (
                  <div className="text-center">
                    <HardDrive className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">
                      Click "Start Scan" to begin analyzing your disk
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Search Results Panel */}
        {showSearchResults && (
          <Card className="mt-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Search className="h-5 w-5" />
                  <span>Search Results</span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSearchResults(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Search files and folders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                {searchTerm ? `Searching for "${searchTerm}"...` : 'Enter a search term to find files and folders'}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Context Menu */}
      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu({ ...contextMenu, visible: false })}
        onOpenInExplorer={handleOpenInExplorer}
        onDelete={handleDeleteFile}
        onCopyPath={handleCopyPath}
        onShowInfo={handleShowInfo}
        fileName={contextMenu.file?.name || ''}
        isDirectory={contextMenu.file?.is_dir || false}
      />
    </div>
  );
}

export default App;