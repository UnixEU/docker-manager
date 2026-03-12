import { useMemo, useState } from 'react'
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
      const { data } = await api.get('/docker/system', {
        params: { realtime: true },
      })
      return data
    },
    refetchInterval: 2000,
  })

  type HistoryWindow = '5m' | '15m' | '1h' | '1d' | '1month'
  const [historyWindow, setHistoryWindow] = useState<HistoryWindow>('5m')

  interface HistoryPoint {
    timestamp: string
    cpu_percent: number
    memory_mb: number
  }

  interface ResourceHistory {
    points: HistoryPoint[]
  }

  const { data: history } = useQuery<ResourceHistory>({
    queryKey: ['system-history', historyWindow],
    queryFn: async () => {
      const { data } = await api.get('/docker/system/history', {
        params: { window: historyWindow },
      })
      return data
    },
    refetchInterval: 2000,
  })

  type Point = { x: number; y: number }

  const timestampsMs = (history?.points ?? []).map((p) =>
    new Date(p.timestamp).getTime()
  )
  const hasHistory = timestampsMs.length > 0
  const minTimeMs = hasHistory ? Math.min(...timestampsMs) : 0
  const maxTimeMs = hasHistory ? Math.max(...timestampsMs) : 0
  const timeRangeMs = maxTimeMs - minTimeMs || 1
  const startTime = hasHistory ? new Date(minTimeMs) : null
  const endTime = hasHistory ? new Date(maxTimeMs) : null

  const cpuValues = (history?.points ?? []).map((p) => p.cpu_percent ?? 0)
  const maxCpuPercent = cpuValues.length ? Math.max(...cpuValues) : 0

  const memoryValues = (history?.points ?? []).map((p) => p.memory_mb ?? 0)
  const maxMemoryMb = memoryValues.length ? Math.max(...memoryValues) : 0

  const cpuPoints = useMemo<Point[]>(() => {
    if (!history?.points?.length) return []
    const height = 40
    const topPad = 2
    const bottomPad = 2
    const innerHeight = height - topPad - bottomPad
    return history.points.map((p) => {
      const t = new Date(p.timestamp).getTime()
      const x = ((t - minTimeMs) / timeRangeMs) * 100
      const value = Math.max(0, p.cpu_percent ?? 0)
      // scale relative to largest observed value (avoid hard‑coding 100)
      const scale = maxCpuPercent > 0 ? maxCpuPercent : 1
      const y = topPad + (1 - value / scale) * innerHeight
      return { x, y }
    })
  }, [history, minTimeMs, timeRangeMs, maxCpuPercent])

  const memoryPoints = useMemo<Point[]>(() => {
    if (!history?.points?.length) return []
    const height = 40
    const topPad = 2
    const bottomPad = 2
    const innerHeight = height - topPad - bottomPad
    const scale = maxMemoryMb > 0 ? maxMemoryMb : 1
    return history.points.map((p) => {
      const t = new Date(p.timestamp).getTime()
      const x = ((t - minTimeMs) / timeRangeMs) * 100
      const value = Math.max(0, p.memory_mb ?? 0)
      const y = topPad + (1 - value / scale) * innerHeight
      return { x, y }
    })
  }, [history, minTimeMs, timeRangeMs, maxMemoryMb])

  const formatTimeLabelForWindow = (date: Date, window: HistoryWindow) => {
    if (window === '5m' || window === '15m' || window === '1h') {
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    }
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Resource Usage</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Time range:</span>
            <select
              className="rounded-md border bg-background px-2 py-1 text-xs"
              value={historyWindow}
              onChange={(e) => setHistoryWindow(e.target.value as HistoryWindow)}
            >
              <option value="5m">Last 5 min</option>
              <option value="15m">Last 15 min</option>
              <option value="1h">Last 1 hour</option>
              <option value="1d">Last 1 day</option>
              <option value="1month">Last 1 month</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Total CPU Usage</h3>
              <Cpu className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold mt-2">{systemInfo?.total_cpu_percent || 0}%</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Across all running containers (updates every 2 seconds)
            </p>
            <div className="mt-1">
              {cpuPoints.length && startTime && endTime ? (
                <>
                  <svg
                    viewBox="0 0 100 40"
                    className="w-full h-20 text-blue-500"
                  >
                    {/* Axes */}
                    <line
                      x1={0}
                      y1={0}
                      x2={0}
                      y2={40}
                      stroke="currentColor"
                      strokeWidth={0.25}
                      className="text-muted-foreground"
                    />
                    <line
                      x1={0}
                      y1={40}
                      x2={100}
                      y2={40}
                      stroke="currentColor"
                      strokeWidth={0.25}
                      className="text-muted-foreground"
                    />
                    {/* CPU line */}
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      points={cpuPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    />
                  </svg>
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>0%</span>
                    <span>{maxCpuPercent.toFixed(2)}%</span>
                  </div>
                  <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                    <span>{formatTimeLabelForWindow(startTime, historyWindow)}</span>
                    <span>{formatTimeLabelForWindow(endTime, historyWindow)}</span>
                  </div>
                </>
              ) : (
                <div className="h-20 flex items-center text-xs text-muted-foreground">
                  Waiting for samples...
                </div>
              )}
            </div>
          </div>
          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Total Memory</h3>
              <MemoryStick className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold mt-2">{systemInfo?.total_memory_mb || 0} MB</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              {formatBytes(systemInfo?.total_memory_bytes || 0)}
            </p>
            <div className="mt-1">
              {memoryPoints.length && startTime && endTime ? (
                <>
                  <svg
                    viewBox="0 0 100 40"
                    className="w-full h-20 text-purple-500"
                  >
                    {/* Axes */}
                    <line
                      x1={0}
                      y1={0}
                      x2={0}
                      y2={40}
                      stroke="currentColor"
                      strokeWidth={0.25}
                      className="text-muted-foreground"
                    />
                    <line
                      x1={0}
                      y1={40}
                      x2={100}
                      y2={40}
                      stroke="currentColor"
                      strokeWidth={0.25}
                      className="text-muted-foreground"
                    />
                    {/* Memory line */}
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      points={memoryPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    />
                  </svg>
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    {(() => {
                      const scale = maxMemoryMb > 0 ? maxMemoryMb : 0
                      const displayScale = scale > 0 ? scale : 1 // avoid divide by zero
                      const useGb = displayScale >= 1024
                      const maxLabelVal = useGb
                        ? (scale / 1024).toFixed(2)
                        : scale.toFixed(2)
                      const unit = useGb ? 'GB' : 'MB'
                      return (
                        <>
                          <span>0 {unit}</span>
                          <span>
                            {maxLabelVal} {unit}
                          </span>
                        </>
                      )
                    })()}
                  </div>
                  <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                    <span>{formatTimeLabelForWindow(startTime, historyWindow)}</span>
                    <span>{formatTimeLabelForWindow(endTime, historyWindow)}</span>
                  </div>
                </>
              ) : (
                <div className="h-20 flex items-center text-xs text-muted-foreground">
                  Waiting for samples...
                </div>
              )}
            </div>
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
