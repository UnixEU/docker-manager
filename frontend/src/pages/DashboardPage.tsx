import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Activity, HardDrive, Package, Network, Container, Cpu, MemoryStick } from 'lucide-react'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export default function DashboardPage() {
  const { data: systemInfo, isLoading } = useQuery({
    queryKey: ['system'],
    queryFn: async () => {
      const { data } = await api.get('/docker/system')
      return data
    },
    refetchInterval: 10000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-muted-foreground">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Docker system overview and statistics</p>
      </div>
      
      {/* Container Status Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Container Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Running</h3>
              <Container className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold mt-2 text-green-600">{systemInfo?.containers_running || 0}</p>
          </div>
          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Stopped</h3>
              <Container className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold mt-2 text-orange-600">{systemInfo?.containers_stopped || 0}</p>
          </div>
          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Exited</h3>
              <Container className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold mt-2 text-red-600">{systemInfo?.containers_exited || 0}</p>
          </div>
          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
              <Container className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold mt-2 text-blue-600">{systemInfo?.containers_created || 0}</p>
          </div>
          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Total</h3>
              <Container className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-bold mt-2">{systemInfo?.containers_total || 0}</p>
          </div>
        </div>
      </div>

      {/* Resource Usage */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Resource Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Total CPU Usage</h3>
              <Cpu className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold mt-2">{systemInfo?.total_cpu_percent || 0}%</p>
            <p className="text-xs text-muted-foreground mt-1">Across all running containers</p>
          </div>
          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Total Memory</h3>
              <MemoryStick className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold mt-2">{systemInfo?.total_memory_mb || 0} MB</p>
            <p className="text-xs text-muted-foreground mt-1">{formatBytes(systemInfo?.total_memory_bytes || 0)}</p>
          </div>
          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Docker Version</h3>
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold mt-2">{systemInfo?.docker_version}</p>
            <p className="text-xs text-muted-foreground mt-1">Server: {systemInfo?.server_version}</p>
          </div>
        </div>
      </div>

      {/* Docker System DF */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Storage Information (docker system df)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Images */}
          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Images</h3>
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Count:</span>
                <span className="font-medium">{systemInfo?.system_df?.images?.count || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Size:</span>
                <span className="font-medium">{formatBytes(systemInfo?.system_df?.images?.total_size || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reclaimable:</span>
                <span className="font-medium text-orange-600">{formatBytes(systemInfo?.system_df?.images?.reclaimable || 0)}</span>
              </div>
            </div>
          </div>

          {/* Containers */}
          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Containers</h3>
              <Container className="h-5 w-5 text-green-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Count:</span>
                <span className="font-medium">{systemInfo?.system_df?.containers?.count || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Size:</span>
                <span className="font-medium">{formatBytes(systemInfo?.system_df?.containers?.total_size || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reclaimable:</span>
                <span className="font-medium text-orange-600">{formatBytes(systemInfo?.system_df?.containers?.reclaimable || 0)}</span>
              </div>
            </div>
          </div>

          {/* Volumes */}
          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Volumes</h3>
              <HardDrive className="h-5 w-5 text-purple-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Count:</span>
                <span className="font-medium">{systemInfo?.system_df?.volumes?.count || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Size:</span>
                <span className="font-medium">{formatBytes(systemInfo?.system_df?.volumes?.total_size || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reclaimable:</span>
                <span className="font-medium text-orange-600">{formatBytes(systemInfo?.system_df?.volumes?.reclaimable || 0)}</span>
              </div>
            </div>
          </div>

          {/* Build Cache */}
          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Build Cache</h3>
              <Network className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Count:</span>
                <span className="font-medium">{systemInfo?.system_df?.build_cache?.count || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Size:</span>
                <span className="font-medium">{formatBytes(systemInfo?.system_df?.build_cache?.total_size || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reclaimable:</span>
                <span className="font-medium text-orange-600">{formatBytes(systemInfo?.system_df?.build_cache?.reclaimable || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">System Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Images</h3>
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold mt-2">{systemInfo?.images_count || 0}</p>
          </div>
          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Networks</h3>
              <Network className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold mt-2">{systemInfo?.networks_count || 0}</p>
          </div>
          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Volumes</h3>
              <HardDrive className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold mt-2">{systemInfo?.volumes_count || 0}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
