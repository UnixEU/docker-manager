# Frontend Components Guide

This document provides a guide for creating the remaining frontend components. The structure is already in place, and you can follow these patterns:

## Pages to Create

### 1. `frontend/src/pages/DashboardPage.tsx`
```typescript
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
// Display Docker system info, charts, and quick stats
```

### 2. `frontend/src/pages/ContainersPage.tsx`
```typescript
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
// List containers with actions (start, stop, restart, delete)
// Detail modal showing full configuration
// Edit modal for updating container settings
```

### 3. `frontend/src/pages/ImagesPage.tsx`
```typescript
// List all Docker images
// Export/Import functionality
// Delete images
```

### 4. `frontend/src/pages/NetworksPage.tsx`
```typescript
// List all networks
// Create new network form
// Connect/disconnect containers
```

### 5. `frontend/src/pages/VolumesPage.tsx`
```typescript
// List all volumes
// Create new volume form
// Delete volumes
```

## Layout Component

### `frontend/src/components/Layout.tsx`
```typescript
import { Outlet } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeProvider'
import { useAuthStore } from '@/stores/authStore'
// Sidebar navigation
// Top bar with user menu and theme toggle
// Main content area with <Outlet />
```

## API Hooks Pattern

Create custom hooks for API calls:

```typescript
// frontend/src/hooks/useDocker.ts
export function useContainers() {
  return useQuery({
    queryKey: ['containers'],
    queryFn: async () => {
      const { data } = await api.get('/docker/containers')
      return data
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  })
}

export function useSystemInfo() {
  return useQuery({
    queryKey: ['system'],
    queryFn: async () => {
      const { data } = await api.get('/docker/system')
      return data
    },
    refetchInterval: 10000,
  })
}
```

## UI Components

Use shadcn/ui components. Install them with:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add table
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add switch
```

## Example Container Card Component

```typescript
import { Play, Square, RotateCw } from 'lucide-react'

interface ContainerCardProps {
  container: {
    id: string
    name: string
    image: string
    status: string
    state: string
  }
}

export function ContainerCard({ container }: ContainerCardProps) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{container.name}</h3>
          <p className="text-sm text-muted-foreground">{container.image}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${
          container.status === 'running' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
        }`}>
          {container.status}
        </span>
      </div>
      <div className="mt-4 flex gap-2">
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
          <Play size={16} />
        </button>
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
          <Square size={16} />
        </button>
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
          <RotateCw size={16} />
        </button>
      </div>
    </div>
  )
}
```

## TypeScript Types

```typescript
// frontend/src/types/docker.ts
export interface Container {
  id: string
  name: string
  image: string
  status: string
  state: string
  created: string
  started_with: string
}

export interface ContainerDetail extends Container {
  ports: Record<string, any>
  volumes: Array<{ source: string; destination: string; mode: string; type: string }>
  networks: string[]
  environment: string[]
  labels: Record<string, string>
}

export interface DockerImage {
  id: string
  tags: string[]
  size: number
  created: string
}
```

## API Service Pattern

```typescript
// frontend/src/services/dockerService.ts
import api from '@/lib/api'

export const dockerService = {
  getContainers: () => api.get('/docker/containers'),
  getContainer: (id: string) => api.get(`/docker/containers/${id}`),
  startContainer: (id: string) => api.post(`/docker/containers/${id}/start`),
  stopContainer: (id: string) => api.post(`/docker/containers/${id}/stop`),
  restartContainer: (id: string) => api.post(`/docker/containers/${id}/restart`),
  // ... more methods
}
```

All the backend APIs are ready and documented at `/docs` when the backend is running!
