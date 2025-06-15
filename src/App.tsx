import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { HardDrive, FolderOpen, Search, Settings, Grid3X3, PieChart } from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Progress } from "./components/ui/progress";
import { TreemapChart } from "./components/TreemapChart";
import { SunburstChart } from "./components/SunburstChart";
import { ThemeToggle } from "./components/ThemeToggle";

function App() {
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'treemap' | 'sunburst'>('treemap');
  const [searchTerm, setSearchTerm] = useState('');
  const [scanProgress, setScanProgress] = useState<any>(null);
  const [scanPath, setScanPath] = useState('');
  const [switchingView, setSwitchingView] = useState(false);  

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
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
            <Button variant="outline" size="icon">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Control Panel */}
          <Card className="lg:col-span-1">
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
          </Card>

          {/* Visualization Area */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Disk Usage Visualization</CardTitle>
                  <CardDescription>
                    Interactive {viewMode === 'treemap' ? 'treemap' : 'sunburst'} of your disk usage
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant={viewMode === 'treemap' ? 'default' : 'outline'}
                    size="sm"
                    disabled={switchingView}
                    onClick={() => {
                      setSwitchingView(true);
                      setTimeout(() => {
                        setViewMode('treemap');
                        setSwitchingView(false);
                      }, 100);
                    }}
                  >
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    Treemap
                  </Button>
                  <Button
                    variant={viewMode === 'sunburst' ? 'default' : 'outline'}
                    size="sm"
                    disabled={switchingView}
                    onClick={() => {
                      setSwitchingView(true);
                      setTimeout(() => {
                        setViewMode('sunburst');
                        setSwitchingView(false);
                      }, 100);
                    }}
                  >
                    <PieChart className="h-4 w-4 mr-2" />
                    Sunburst
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
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
                  ) : (
                    <SunburstChart 
                      data={scanResults.root} 
                      onNodeClick={(data) => console.log('Clicked:', data)}
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
      </div>
    </div>
  );
}

export default App;