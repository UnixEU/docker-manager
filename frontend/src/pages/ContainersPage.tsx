import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toast } from 'sonner'
import { Play, Square, RotateCw, Eye, Edit, Trash2, FileCode, X, Plus, Minus } from 'lucide-react'

export default function ContainersPage() {
  const queryClient = useQueryClient()
  const [selectedContainer, setSelectedContainer] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editData, setEditData] = useState<any>(null)
  const [composeContent, setComposeContent] = useState('')
  const [newComposeContent, setNewComposeContent] = useState('')

  const { data: containers, isLoading } = useQuery({
    queryKey: ['containers'],
    queryFn: async () => {
      const { data } = await api.get('/docker/containers')
      return data
    },
    refetchInterval: 5000,
  })

  const startMutation = useMutation({
    mutationFn: (id: string) => api.post(`/docker/containers/${id}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
      toast.success('Container started')
    },
  })

  const stopMutation = useMutation({
    mutationFn: (id: string) => api.post(`/docker/containers/${id}/stop`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
      toast.success('Container stopped')
    },
  })

  const restartMutation = useMutation({
    mutationFn: (id: string) => api.post(`/docker/containers/${id}/restart`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
      toast.success('Container restarted')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/docker/containers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
      toast.success('Container deleted')
      setIsDeleteOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      api.put(`/docker/containers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
      toast.success('Container updated')
      setIsEditOpen(false)
    },
  })

  const openDetails = async (container: any) => {
    try {
      const { data } = await api.get(`/docker/containers/${container.id}`)
      setSelectedContainer(data)
      setIsDetailsOpen(true)
    } catch (error) {
      toast.error('Failed to load container details')
    }
  }

  const openEdit = async (container: any) => {
    try {
      const { data } = await api.get(`/docker/containers/${container.id}`)
      setSelectedContainer(data)
      setEditData({
        environment: data.environment || [],
        image: data.image
      })
      setIsEditOpen(true)
    } catch (error) {
      toast.error('Failed to load container details')
    }
  }

  const openCompose = async (container: any) => {
    if (container.started_with !== 'compose') {
      toast.error('This container was not started with docker-compose')
      return
    }
    try {
      const { data } = await api.get(`/docker/containers/${container.id}/compose`)
      setSelectedContainer(container)
      setComposeContent(data.compose_file)
      setIsComposeOpen(true)
    } catch (error) {
      toast.error('Failed to load docker-compose.yml')
    }
  }

  const handleUpdate = () => {
    if (!selectedContainer) return
    updateMutation.mutate({
      id: selectedContainer.id,
      data: editData
    })
  }

  const handleComposeUpdate = async () => {
    if (!selectedContainer) return
    try {
      await api.put(`/docker/containers/${selectedContainer.id}/compose`, {
        compose_file: composeContent
      })
      toast.success('docker-compose.yml updated and redeployed')
      setIsComposeOpen(false)
      queryClient.invalidateQueries({ queryKey: ['containers'] })
    } catch (error) {
      toast.error('Failed to update docker-compose.yml')
    }
  }

  const handleCreateFromCompose = async () => {
    if (!newComposeContent.trim()) {
      toast.error('docker-compose content is required')
      return
    }
    try {
      toast.info('Creating containers from docker-compose...')
      await api.post('/docker/compose/up', {
        compose_file: newComposeContent
      })
      toast.success('Container stack created successfully')
      setIsCreateOpen(false)
      setNewComposeContent('')
      queryClient.invalidateQueries({ queryKey: ['containers'] })
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create container stack')
    }
  }

  if (isLoading) return <div className="flex items-center justify-center h-96"><div className="text-lg">Loading containers...</div></div>

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Containers</h1>
          <p className="text-muted-foreground mt-1">Manage your Docker containers</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus size={16} />
          Create from Compose
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {containers?.map((container: any) => (
          <div key={container.id} className="p-4 bg-card rounded-lg border shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{container.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{container.image}</p>
                {container.started_with === 'compose' && (
                  <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-1">
                    <FileCode size={12} />
                    docker-compose
                  </span>
                )}
              </div>
              <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ml-2 ${
                container.status === 'running' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
              }`}>
                {container.status}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => startMutation.mutate(container.id)}
                className="p-2 hover:bg-accent rounded transition-colors"
                title="Start"
                disabled={container.status === 'running'}
              >
                <Play size={16} />
              </button>
              <button
                onClick={() => stopMutation.mutate(container.id)}
                className="p-2 hover:bg-accent rounded transition-colors"
                title="Stop"
                disabled={container.status !== 'running'}
              >
                <Square size={16} />
              </button>
              <button
                onClick={() => restartMutation.mutate(container.id)}
                className="p-2 hover:bg-accent rounded transition-colors"
                title="Restart"
              >
                <RotateCw size={16} />
              </button>
              <button
                onClick={() => openDetails(container)}
                className="p-2 hover:bg-accent rounded transition-colors"
                title="View Details"
              >
                <Eye size={16} />
              </button>
              <button
                onClick={() => openEdit(container)}
                className="p-2 hover:bg-accent rounded transition-colors"
                title="Edit"
              >
                <Edit size={16} />
              </button>
              {container.started_with === 'compose' && (
                <button
                  onClick={() => openCompose(container)}
                  className="p-2 hover:bg-accent rounded transition-colors"
                  title="Edit docker-compose.yml"
                >
                  <FileCode size={16} />
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedContainer(container)
                  setIsDeleteOpen(true)
                }}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors text-red-600"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Details Modal */}
      {isDetailsOpen && selectedContainer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsDetailsOpen(false)}>
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-background border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Container Details: {selectedContainer.name}</h2>
              <button onClick={() => setIsDetailsOpen(false)} className="p-2 hover:bg-accent rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">Basic Info</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-muted-foreground">ID:</span> <span className="font-mono">{selectedContainer.id}</span></div>
                  <div><span className="text-muted-foreground">Image:</span> {selectedContainer.image}</div>
                  <div><span className="text-muted-foreground">Status:</span> {selectedContainer.status}</div>
                  <div><span className="text-muted-foreground">Created:</span> {selectedContainer.created}</div>
                </div>
              </div>

              {selectedContainer.environment?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Environment Variables</h3>
                  <div className="bg-muted p-3 rounded font-mono text-sm space-y-1">
                    {selectedContainer.environment.map((env: string, i: number) => (
                      <div key={i}>{env}</div>
                    ))}
                  </div>
                </div>
              )}

              {selectedContainer.ports && Object.keys(selectedContainer.ports).length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Ports</h3>
                  <div className="bg-muted p-3 rounded font-mono text-sm space-y-1">
                    {Object.entries(selectedContainer.ports).map(([key, value]: any) => (
                      <div key={key}>{key} → {JSON.stringify(value)}</div>
                    ))}
                  </div>
                </div>
              )}

              {selectedContainer.volumes?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Volumes</h3>
                  <div className="space-y-2">
                    {selectedContainer.volumes.map((vol: any, i: number) => (
                      <div key={i} className="bg-muted p-3 rounded text-sm">
                        <div><span className="text-muted-foreground">Type:</span> {vol.type}</div>
                        <div><span className="text-muted-foreground">Source:</span> <span className="font-mono">{vol.source}</span></div>
                        <div><span className="text-muted-foreground">Destination:</span> <span className="font-mono">{vol.destination}</span></div>
                        <div><span className="text-muted-foreground">Mode:</span> {vol.mode}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedContainer.networks?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Networks</h3>
                  <div className="bg-muted p-3 rounded font-mono text-sm space-y-1">
                    {selectedContainer.networks.map((net: string, i: number) => (
                      <div key={i}>{net}</div>
                    ))}
                  </div>
                </div>
              )}

              {selectedContainer.labels && Object.keys(selectedContainer.labels).length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Labels</h3>
                  <div className="bg-muted p-3 rounded font-mono text-sm space-y-1 max-h-48 overflow-y-auto">
                    {Object.entries(selectedContainer.labels).map(([key, value]: any) => (
                      <div key={key}>{key}: {value}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && selectedContainer && editData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsEditOpen(false)}>
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-background border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Container: {selectedContainer.name}</h2>
              <button onClick={() => setIsEditOpen(false)} className="p-2 hover:bg-accent rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Docker Image</label>
                <input
                  type="text"
                  value={editData.image}
                  onChange={(e) => setEditData({ ...editData, image: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder="nginx:latest"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">Environment Variables</label>
                  <button
                    onClick={() => setEditData({ ...editData, environment: [...editData.environment, 'KEY=value'] })}
                    className="text-sm px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  >
                    <Plus size={14} className="inline" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {editData.environment.map((env: string, i: number) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={env}
                        onChange={(e) => {
                          const newEnv = [...editData.environment]
                          newEnv[i] = e.target.value
                          setEditData({ ...editData, environment: newEnv })
                        }}
                        className="flex-1 px-3 py-2 border rounded-md bg-background font-mono text-sm"
                      />
                      <button
                        onClick={() => {
                          const newEnv = editData.environment.filter((_: any, idx: number) => idx !== i)
                          setEditData({ ...editData, environment: newEnv })
                        }}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
                      >
                        <Minus size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border rounded hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Updating...' : 'Update & Redeploy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compose Editor Modal */}
      {isComposeOpen && selectedContainer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsComposeOpen(false)}>
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-background border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit docker-compose.yml: {selectedContainer.name}</h2>
              <button onClick={() => setIsComposeOpen(false)} className="p-2 hover:bg-accent rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={composeContent}
                onChange={(e) => setComposeContent(e.target.value)}
                className="w-full h-96 px-3 py-2 border rounded-md bg-background font-mono text-sm"
                placeholder="version: '3.8'\nservices:\n  app:\n    image: nginx\n    ..."
              />
              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2 border rounded hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleComposeUpdate}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  Save & Redeploy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create from Compose Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsCreateOpen(false)}>
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-background border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Create Container Stack from docker-compose</h2>
              <button onClick={() => setIsCreateOpen(false)} className="p-2 hover:bg-accent rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Paste your docker-compose.yml content below to create a container stack.
              </p>
              <textarea
                value={newComposeContent}
                onChange={(e) => setNewComposeContent(e.target.value)}
                className="w-full h-96 px-3 py-2 border rounded-md bg-background font-mono text-sm"
                placeholder={`version: '3.8'\nservices:\n  app:\n    image: nginx:latest\n    ports:\n      - "80:80"\n    ...`}
              />
              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border rounded hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFromCompose}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  Create Stack
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && selectedContainer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsDeleteOpen(false)}>
          <div className="bg-background rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-bold">Delete Container?</h2>
              <p className="text-muted-foreground">
                Are you sure you want to delete container <strong>{selectedContainer.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsDeleteOpen(false)}
                  className="px-4 py-2 border rounded hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate(selectedContainer.id)}
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
