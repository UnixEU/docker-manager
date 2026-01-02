import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toast } from 'sonner'
import { Plus, Trash2, X, HardDrive } from 'lucide-react'

export default function VolumesPage() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedVolume, setSelectedVolume] = useState<any>(null)
  const [newVolume, setNewVolume] = useState({
    name: '',
    driver: 'local',
    host_path: ''
  })
  const [volumeType, setVolumeType] = useState<'named' | 'bind'>('named')

  const { data: volumes, isLoading } = useQuery({
    queryKey: ['volumes'],
    queryFn: async () => {
      const { data } = await api.get('/docker/volumes')
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/docker/volumes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volumes'] })
      toast.success('Volume created')
      setIsCreateOpen(false)
      setNewVolume({ name: '', driver: 'local', host_path: '' })
      setVolumeType('named')
    },
    onError: () => {
      toast.error('Failed to create volume')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (name: string) => api.delete(`/docker/volumes/${name}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volumes'] })
      toast.success('Volume deleted')
      setIsDeleteOpen(false)
    },
    onError: () => {
      toast.error('Failed to delete volume')
    }
  })

  const handleCreateVolume = () => {
    if (!newVolume.name) {
      toast.error('Volume name is required')
      return
    }
    if (volumeType === 'bind' && !newVolume.host_path) {
      toast.error('Host path is required for bind mounts')
      return
    }
    
    const volumeData = volumeType === 'bind' 
      ? { ...newVolume, host_path: newVolume.host_path }
      : { name: newVolume.name, driver: newVolume.driver }
    
    createMutation.mutate(volumeData)
  }

  if (isLoading) return <div className="flex items-center justify-center h-96"><div className="text-lg">Loading volumes...</div></div>

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Volumes</h1>
          <p className="text-muted-foreground mt-1">Manage Docker volumes</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus size={16} />
          Create Volume
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {volumes?.map((volume: any) => (
          <div key={volume.name} className="p-4 bg-card rounded-lg border shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              <HardDrive className="h-5 w-5 text-primary mt-1" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{volume.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">Driver: {volume.driver}</p>
                {volume.is_bind_mount && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    🔗 Bind Mount
                  </p>
                )}
              </div>
            </div>
            {volume.host_path ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Host Path:</p>
                <p className="text-xs font-mono bg-muted px-2 py-1 rounded truncate" title={volume.host_path}>
                  {volume.host_path}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground truncate" title={volume.mountpoint}>
                {volume.mountpoint}
              </p>
            )}
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => {
                  setSelectedVolume(volume)
                  setIsDeleteOpen(true)
                }}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors text-red-600"
                title="Delete Volume"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Volume Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsCreateOpen(false)}>
          <div className="bg-background rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Create Volume</h2>
              <button onClick={() => setIsCreateOpen(false)} className="p-2 hover:bg-accent rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Volume Type *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="named"
                      checked={volumeType === 'named'}
                      onChange={(e) => setVolumeType(e.target.value as 'named' | 'bind')}
                      className="cursor-pointer"
                    />
                    <span>Named Volume</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="bind"
                      checked={volumeType === 'bind'}
                      onChange={(e) => setVolumeType(e.target.value as 'named' | 'bind')}
                      className="cursor-pointer"
                    />
                    <span>Bind Mount (Host Path)</span>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {volumeType === 'named' 
                    ? 'Named volumes are managed by Docker and stored in Docker\'s storage directory'
                    : 'Bind mounts link a host directory to a container path'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Volume Name *</label>
                <input
                  type="text"
                  value={newVolume.name}
                  onChange={(e) => setNewVolume({ ...newVolume, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder="my-volume"
                />
              </div>

              {volumeType === 'bind' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Host Path *</label>
                  <input
                    type="text"
                    value={newVolume.host_path}
                    onChange={(e) => setNewVolume({ ...newVolume, host_path: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background font-mono text-sm"
                    placeholder="/path/on/host"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Absolute path to the directory on the host system
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Driver</label>
                <select
                  value={newVolume.driver}
                  onChange={(e) => setNewVolume({ ...newVolume, driver: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="local">local</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Local driver stores volume data on the Docker host
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border rounded hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateVolume}
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && selectedVolume && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsDeleteOpen(false)}>
          <div className="bg-background rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-bold">Delete Volume?</h2>
              <p className="text-muted-foreground">
                Are you sure you want to delete volume <strong>{selectedVolume.name}</strong>?
              </p>
              <div className="bg-muted p-3 rounded text-sm">
                <div><span className="text-muted-foreground">Name:</span> {selectedVolume.name}</div>
                <div><span className="text-muted-foreground">Driver:</span> {selectedVolume.driver}</div>
                <div className="text-xs text-muted-foreground mt-1 break-all">{selectedVolume.mountpoint}</div>
              </div>
              <p className="text-sm text-red-600">This action cannot be undone. All data in this volume will be lost.</p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsDeleteOpen(false)}
                  className="px-4 py-2 border rounded hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate(selectedVolume.name)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
