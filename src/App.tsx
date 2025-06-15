import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { HardDrive, FolderOpen, Search, Settings, Grid3X3, PieChart } from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { TreemapChart } from "./components/TreemapChart";
import { SunburstChart } from "./components/SunburstChart";
import { ThemeToggle } from "./components/ThemeToggle";

function App() {
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'treemap' | 'sunburst'>('treemap');
  const [searchTerm, setSearchTerm] = useState('');

  async function startScan() {
    setScanning(true);
    try {
      // Try real scan first, fall back to demo data
      try {
        const defaultPath = navigator.userAgent.includes('Windows') ? 'C:\\' : '/home';
        const results = await invoke("scan_directory", { path: defaultPath });
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
                    onClick={() => setViewMode('treemap')}
                  >
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    Treemap
                  </Button>
                  <Button
                    variant={viewMode === 'sunburst' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('sunburst')}
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
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Scanning directories...</p>
                  </div>
                ) : scanResults ? (
                  viewMode === 'treemap' ? (
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