import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toast } from 'sonner'
import { Plus, X, Network as NetworkIcon, Link, Unlink } from 'lucide-react'

export default function NetworksPage() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState<any>(null)
  const [newNetwork, setNewNetwork] = useState({
    name: '',
    driver: 'bridge'
  })

  const { data: networks, isLoading } = useQuery({
    queryKey: ['networks'],
    queryFn: async () => {
      const { data } = await api.get('/docker/networks')
      return data
    },
  })

  const { data: allContainers } = useQuery({
    queryKey: ['containers'],
    queryFn: async () => {
      const { data } = await api.get('/docker/containers')
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/docker/networks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networks'] })
      toast.success('Network created')
      setIsCreateOpen(false)
      setNewNetwork({ name: '', driver: 'bridge' })
    },
    onError: () => {
      toast.error('Failed to create network')
    }
  })

  const connectMutation = useMutation({
    mutationFn: ({ networkId, containerId }: { networkId: string; containerId: string }) => 
      api.post(`/docker/networks/${networkId}/connect`, { container_id: containerId }),
    onSuccess: () => {
      toast.success('Container connected to network')
      queryClient.invalidateQueries({ queryKey: ['networks'] })
      queryClient.invalidateQueries({ queryKey: ['containers'] })
      if (selectedNetwork) {
        loadNetworkDetails(selectedNetwork.id)
      }
    },
    onError: () => {
      toast.error('Failed to connect container')
    }
  })

  const disconnectMutation = useMutation({
    mutationFn: ({ networkId, containerId }: { networkId: string; containerId: string }) => 
      api.post(`/docker/networks/${networkId}/disconnect`, { container_id: containerId }),
    onSuccess: () => {
      toast.success('Container disconnected from network')
      queryClient.invalidateQueries({ queryKey: ['networks'] })
      queryClient.invalidateQueries({ queryKey: ['containers'] })
      if (selectedNetwork) {
        loadNetworkDetails(selectedNetwork.id)
      }
    },
    onError: () => {
      toast.error('Failed to disconnect container')
    }
  })

  const loadNetworkDetails = async (networkId: string) => {
    try {
      const { data } = await api.get(`/docker/networks/${networkId}`)
      setSelectedNetwork(data)
      setIsDetailsOpen(true)
    } catch (error) {
      toast.error('Failed to load network details')
    }
  }

  const handleCreateNetwork = () => {
    if (!newNetwork.name) {
      toast.error('Network name is required')
      return
    }
    createMutation.mutate(newNetwork)
  }

  if (isLoading) return <div className="flex items-center justify-center h-96"><div className="text-lg">Loading networks...</div></div>

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Networks</h1>
          <p className="text-muted-foreground mt-1">Manage Docker networks</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus size={16} />
          Create Network
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {networks?.map((network: any) => (
          <div 
            key={network.id} 
            className="p-4 bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => loadNetworkDetails(network.id)}
          >
            <div className="flex items-start gap-3">
              <NetworkIcon className="h-5 w-5 text-primary mt-1" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{network.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">Driver: {network.driver}</p>
                <p className="text-sm text-muted-foreground">Scope: {network.scope}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Network Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsCreateOpen(false)}>
          <div className="bg-background rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Create Network</h2>
              <button onClick={() => setIsCreateOpen(false)} className="p-2 hover:bg-accent rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Network Name *</label>
                <input
                  type="text"
                  value={newNetwork.name}
                  onChange={(e) => setNewNetwork({ ...newNetwork, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder="my-network"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Driver</label>
                <select
                  value={newNetwork.driver}
                  onChange={(e) => setNewNetwork({ ...newNetwork, driver: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="bridge">bridge</option>
                  <option value="host">host</option>
                  <option value="overlay">overlay</option>
                  <option value="macvlan">macvlan</option>
                  <option value="none">none</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border rounded hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNetwork}
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

      {/* Network Details Modal */}
      {isDetailsOpen && selectedNetwork && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsDetailsOpen(false)}>
          <div className="bg-background rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-background border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Network: {selectedNetwork.name}</h2>
              <button onClick={() => setIsDetailsOpen(false)} className="p-2 hover:bg-accent rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">Details</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-muted-foreground">ID:</span> <span className="font-mono">{selectedNetwork.id}</span></div>
                  <div><span className="text-muted-foreground">Driver:</span> {selectedNetwork.driver}</div>
                  <div><span className="text-muted-foreground">Scope:</span> {selectedNetwork.scope}</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Connected Containers</h3>
                {selectedNetwork.containers && selectedNetwork.containers.length > 0 ? (
                  <div className="space-y-2">
                    {selectedNetwork.containers.map((container: any) => (
                      <div key={container.id} className="flex justify-between items-center p-3 bg-muted rounded">
                        <div>
                          <div className="font-medium">{container.name}</div>
                          <div className="text-sm text-muted-foreground">{container.image}</div>
                        </div>
                        <button
                          onClick={() => disconnectMutation.mutate({ 
                            networkId: selectedNetwork.id, 
                            containerId: container.id 
                          })}
                          disabled={disconnectMutation.isPending}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          <Unlink size={14} />
                          Disconnect
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No containers connected</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Connect Container</h3>
                <div className="space-y-2">
                  {allContainers?.filter((c: any) => 
                    !selectedNetwork.containers?.some((nc: any) => nc.id === c.id)
                  ).map((container: any) => (
                    <div key={container.id} className="flex justify-between items-center p-3 bg-muted rounded">
                      <div>
                        <div className="font-medium">{container.name}</div>
                        <div className="text-sm text-muted-foreground">{container.image}</div>
                      </div>
                      <button
                        onClick={() => connectMutation.mutate({ 
                          networkId: selectedNetwork.id, 
                          containerId: container.id 
                        })}
                        disabled={connectMutation.isPending}
                        className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
                      >
                        <Link size={14} />
                        Connect
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
