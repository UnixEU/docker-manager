import docker
from docker.models.containers import Container
from docker.errors import DockerException, NotFound, APIError
from typing import List, Dict, Any, Optional
import yaml
import os
import tempfile
from pathlib import Path


class DockerService:
    def __init__(self):
        try:
            # Use from_env() which automatically configures the client
            self.client = docker.from_env()
            self.client.ping()
        except DockerException as e:
            raise Exception(f"Failed to connect to Docker: {str(e)}")
    
    def get_system_info(self) -> Dict[str, Any]:
        """Get Docker system information with enhanced stats"""
        info = self.client.info()
        version = self.client.version()
        
        containers = self.client.containers.list(all=True)
        
        # Count containers by status
        status_counts = {"running": 0, "exited": 0, "stopped": 0, "created": 0, "paused": 0, "other": 0}
        total_cpu = 0.0
        total_memory = 0
        
        for container in containers:
            status = container.status.lower()
            if status in status_counts:
                status_counts[status] += 1
            else:
                status_counts["other"] += 1
            
            # Get resource usage for running containers
            if status == "running":
                try:
                    stats = container.stats(stream=False)
                    # Calculate CPU percentage
                    cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                                stats['precpu_stats']['cpu_usage']['total_usage']
                    system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                                  stats['precpu_stats']['system_cpu_usage']
                    if system_delta > 0:
                        cpu_percent = (cpu_delta / system_delta) * \
                                     len(stats['cpu_stats']['cpu_usage'].get('percpu_usage', [1])) * 100.0
                        total_cpu += cpu_percent
                    
                    # Get memory usage
                    total_memory += stats['memory_stats'].get('usage', 0)
                except Exception:
                    pass
        
        # Get docker system df info
        df_info = self.get_system_df()
        
        return {
            "containers_running": status_counts["running"],
            "containers_stopped": status_counts["stopped"],
            "containers_exited": status_counts["exited"],
            "containers_created": status_counts["created"],
            "containers_paused": status_counts["paused"],
            "containers_total": len(containers),
            "images_count": len(self.client.images.list()),
            "volumes_count": len(self.client.volumes.list()),
            "networks_count": len(self.client.networks.list()),
            "docker_version": version.get("Version", "Unknown"),
            "server_version": info.get("ServerVersion", "Unknown"),
            "total_cpu_percent": round(total_cpu, 2),
            "total_memory_bytes": total_memory,
            "total_memory_mb": round(total_memory / (1024 * 1024), 2),
            "system_df": df_info
        }
    
    def _detect_container_type(self, container: Container) -> str:
        """Detect if container was started with docker run or docker compose"""
        labels = container.labels
        if "com.docker.compose.project" in labels:
            return "docker compose"
        return "docker run"
    
    def list_containers(self, all: bool = True) -> List[Dict[str, Any]]:
        """List all containers"""
        containers = self.client.containers.list(all=all)
        result = []
        
        for container in containers:
            result.append({
                "id": container.short_id,
                "name": container.name,
                "image": container.image.tags[0] if container.image.tags else container.image.short_id,
                "status": container.status,
                "state": container.attrs['State']['Status'],
                "created": container.attrs['Created'],
                "started_with": self._detect_container_type(container)
            })
        
        return result
    
    def get_container_details(self, container_id: str) -> Dict[str, Any]:
        """Get detailed information about a container"""
        try:
            container = self.client.containers.get(container_id)
            attrs = container.attrs
            config = attrs['Config']
            network_settings = attrs['NetworkSettings']
            
            # Parse volumes
            volumes = []
            mounts = attrs.get('Mounts', [])
            for mount in mounts:
                volumes.append({
                    "source": mount.get('Source', ''),
                    "destination": mount.get('Destination', ''),
                    "mode": mount.get('Mode', ''),
                    "type": mount.get('Type', '')
                })
            
            # Parse networks
            networks = list(network_settings['Networks'].keys())
            
            # Parse ports
            ports = network_settings.get('Ports', {})
            
            return {
                "id": container.short_id,
                "name": container.name,
                "image": container.image.tags[0] if container.image.tags else container.image.short_id,
                "status": container.status,
                "state": attrs['State']['Status'],
                "created": attrs['Created'],
                "ports": ports,
                "volumes": volumes,
                "networks": networks,
                "environment": config.get('Env', []),
                "labels": config.get('Labels', {}),
                "started_with": self._detect_container_type(container)
            }
        except NotFound:
            raise Exception(f"Container {container_id} not found")
        except APIError as e:
            raise Exception(f"Docker API error: {str(e)}")
    
    def start_container(self, container_id: str) -> Dict[str, str]:
        """Start a container"""
        try:
            container = self.client.containers.get(container_id)
            container.start()
            return {"status": "success", "message": f"Container {container_id} started"}
        except NotFound:
            raise Exception(f"Container {container_id} not found")
        except APIError as e:
            raise Exception(f"Failed to start container: {str(e)}")
    
    def stop_container(self, container_id: str) -> Dict[str, str]:
        """Stop a container"""
        try:
            container = self.client.containers.get(container_id)
            container.stop()
            return {"status": "success", "message": f"Container {container_id} stopped"}
        except NotFound:
            raise Exception(f"Container {container_id} not found")
        except APIError as e:
            raise Exception(f"Failed to stop container: {str(e)}")
    
    def restart_container(self, container_id: str) -> Dict[str, str]:
        """Restart a container"""
        try:
            container = self.client.containers.get(container_id)
            container.restart()
            return {"status": "success", "message": f"Container {container_id} restarted"}
        except NotFound:
            raise Exception(f"Container {container_id} not found")
        except APIError as e:
            raise Exception(f"Failed to restart container: {str(e)}")
    
    def remove_container(self, container_id: str, force: bool = False) -> Dict[str, str]:
        """Remove a container"""
        try:
            container = self.client.containers.get(container_id)
            container.remove(force=force)
            return {"status": "success", "message": f"Container {container_id} removed"}
        except NotFound:
            raise Exception(f"Container {container_id} not found")
        except APIError as e:
            raise Exception(f"Failed to remove container: {str(e)}")
    
    def update_container(self, container_id: str, updates: Dict[str, Any]) -> Dict[str, str]:
        """Update container configuration by recreating it"""
        try:
            old_container = self.client.containers.get(container_id)
            attrs = old_container.attrs
            config = attrs['Config']
            host_config = attrs['HostConfig']
            
            # Get current configuration
            image = updates.get('image', config['Image'])
            environment = updates.get('environment', config.get('Env', []))
            
            # Handle volumes
            volumes = {}
            binds = []
            if 'volumes' in updates:
                for vol in updates['volumes']:
                    if ':' in vol:
                        source, dest = vol.split(':')[:2]
                        volumes[dest] = {}
                        binds.append(vol)
            else:
                mounts = attrs.get('Mounts', [])
                for mount in mounts:
                    if mount['Type'] == 'bind':
                        bind_str = f"{mount['Source']}:{mount['Destination']}"
                        if 'Mode' in mount:
                            bind_str += f":{mount['Mode']}"
                        binds.append(bind_str)
                        volumes[mount['Destination']] = {}
            
            # Handle networks
            networks = updates.get('networks', list(attrs['NetworkSettings']['Networks'].keys()))
            
            # Handle ports
            ports = updates.get('ports', host_config.get('PortBindings', {}))
            
            # Stop and remove old container
            old_container.stop()
            old_container.remove()
            
            # Create new container
            new_container = self.client.containers.run(
                image=image,
                name=old_container.name,
                environment=environment,
                volumes=volumes if volumes else None,
                ports=ports if ports else None,
                detach=True,
                network=networks[0] if networks else None
            )
            
            # Connect to additional networks
            for network in networks[1:]:
                try:
                    net = self.client.networks.get(network)
                    net.connect(new_container)
                except Exception:
                    pass
            
            return {"status": "success", "message": f"Container {container_id} updated and recreated"}
        except NotFound:
            raise Exception(f"Container {container_id} not found")
        except APIError as e:
            raise Exception(f"Failed to update container: {str(e)}")
    
    def get_compose_file(self, container_id: str) -> Optional[str]:
        """Get docker-compose.yml content for a container started with compose"""
        try:
            container = self.client.containers.get(container_id)
            labels = container.labels
            
            if "com.docker.compose.project" not in labels:
                return None
            
            project = labels.get("com.docker.compose.project")
            project_dir = labels.get("com.docker.compose.project.working_dir", "")
            
            if project_dir:
                compose_file = Path(project_dir) / "docker-compose.yml"
                if compose_file.exists():
                    return compose_file.read_text()
            
            return None
        except Exception:
            return None
    
    def update_compose_file(self, container_id: str, compose_content: str) -> Dict[str, str]:
        """Update docker-compose.yml and recreate container"""
        try:
            container = self.client.containers.get(container_id)
            labels = container.labels
            
            if "com.docker.compose.project" not in labels:
                raise Exception("Container was not started with docker-compose")
            
            project_dir = labels.get("com.docker.compose.project.working_dir", "")
            if not project_dir:
                raise Exception("Cannot determine compose project directory")
            
            compose_file = Path(project_dir) / "docker-compose.yml"
            compose_file.write_text(compose_content)
            
            # Use docker-compose to recreate
            import subprocess
            result = subprocess.run(
                ["docker-compose", "up", "-d", "--force-recreate"],
                cwd=project_dir,
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                raise Exception(f"Failed to recreate container: {result.stderr}")
            
            return {"status": "success", "message": "Container recreated with new compose configuration"}
        except NotFound:
            raise Exception(f"Container {container_id} not found")
        except Exception as e:
            raise Exception(f"Failed to update compose: {str(e)}")
    
    def create_network(self, name: str, driver: str = "bridge", options: Optional[Dict] = None) -> Dict[str, str]:
        """Create a Docker network"""
        try:
            network = self.client.networks.create(
                name=name,
                driver=driver,
                options=options or {}
            )
            return {"status": "success", "message": f"Network {name} created", "id": network.short_id}
        except APIError as e:
            raise Exception(f"Failed to create network: {str(e)}")
    
    def create_volume(self, name: str, driver: str = "local", options: Optional[Dict] = None, host_path: Optional[str] = None) -> Dict[str, str]:
        """Create a Docker volume or bind mount configuration"""
        try:
            # If host_path is provided, create volume with bind mount driver options
            if host_path:
                # For bind mounts, we need to use the local driver with device option
                driver_opts = options or {}
                driver_opts["type"] = "none"
                driver_opts["o"] = "bind"
                driver_opts["device"] = host_path
                
                volume = self.client.volumes.create(
                    name=name,
                    driver=driver,
                    driver_opts=driver_opts
                )
            else:
                volume = self.client.volumes.create(
                    name=name,
                    driver=driver,
                    driver_opts=options or {}
                )
            return {"status": "success", "message": f"Volume {name} created", "name": volume.name}
        except APIError as e:
            raise Exception(f"Failed to create volume: {str(e)}")
    
    def list_networks(self) -> List[Dict[str, Any]]:
        """List all Docker networks"""
        networks = self.client.networks.list()
        return [
            {
                "id": net.short_id,
                "name": net.name,
                "driver": net.attrs.get('Driver', 'unknown'),
                "scope": net.attrs.get('Scope', 'unknown')
            }
            for net in networks
        ]
    
    def list_volumes(self) -> List[Dict[str, Any]]:
        """List all Docker volumes"""
        volumes = self.client.volumes.list()
        result = []
        for vol in volumes:
            driver_opts = vol.attrs.get('Options', {})
            host_path = driver_opts.get('device', '') if driver_opts else ''
            is_bind = driver_opts.get('type') == 'none' and driver_opts.get('o') == 'bind' if driver_opts else False
            
            result.append({
                "name": vol.name,
                "driver": vol.attrs.get('Driver', 'unknown'),
                "mountpoint": vol.attrs.get('Mountpoint', ''),
                "host_path": host_path,
                "is_bind_mount": is_bind
            })
        return result
    
    def list_images(self) -> List[Dict[str, Any]]:
        """List all Docker images"""
        images = self.client.images.list()
        result = []
        for img in images:
            result.append({
                "id": img.short_id,
                "tags": img.tags,
                "size": img.attrs.get('Size', 0),
                "created": img.attrs.get('Created', '')
            })
        return result
    
    def export_image(self, image_name: str, tag: str = "latest") -> bytes:
        """Export a Docker image as tar"""
        try:
            full_name = f"{image_name}:{tag}"
            image = self.client.images.get(full_name)
            return image.save()
        except NotFound:
            raise Exception(f"Image {image_name}:{tag} not found")
        except APIError as e:
            raise Exception(f"Failed to export image: {str(e)}")
    
    def import_image(self, image_data: bytes) -> Dict[str, str]:
        """Import a Docker image from tar"""
        try:
            # Save to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.tar') as tmp:
                tmp.write(image_data)
                tmp_path = tmp.name
            
            # Load image
            with open(tmp_path, 'rb') as f:
                images = self.client.images.load(f)
                
            os.unlink(tmp_path)
            
            if images:
                tags = images[0].tags if images[0].tags else ['unknown']
                return {"status": "success", "message": f"Image imported: {tags[0]}"}
            
            return {"status": "success", "message": "Image imported"}
        except APIError as e:
            raise Exception(f"Failed to import image: {str(e)}")
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    
    def connect_container_to_network(self, container_id: str, network_name: str) -> Dict[str, str]:
        """Connect a container to a network"""
        try:
            container = self.client.containers.get(container_id)
            network = self.client.networks.get(network_name)
            network.connect(container)
            return {"status": "success", "message": f"Container connected to network {network_name}"}
        except NotFound as e:
            raise Exception(f"Container or network not found: {str(e)}")
        except APIError as e:
            raise Exception(f"Failed to connect container to network: {str(e)}")
    
    def disconnect_container_from_network(self, container_id: str, network_name: str) -> Dict[str, str]:
        """Disconnect a container from a network"""
        try:
            container = self.client.containers.get(container_id)
            network = self.client.networks.get(network_name)
            network.disconnect(container)
            return {"status": "success", "message": f"Container disconnected from network {network_name}"}
        except NotFound as e:
            raise Exception(f"Container or network not found: {str(e)}")
        except APIError as e:
            raise Exception(f"Failed to disconnect container from network: {str(e)}")
    
    def get_system_df(self) -> Dict[str, Any]:
        """Get docker system df information"""
        try:
            df = self.client.df()
            return {
                "images": {
                    "total_size": sum(img.get('Size', 0) for img in df.get('Images', [])),
                    "count": len(df.get('Images', [])),
                    "reclaimable": sum(img.get('Size', 0) for img in df.get('Images', []) if img.get('Containers', 0) == 0)
                },
                "containers": {
                    "total_size": sum(c.get('SizeRw', 0) for c in df.get('Containers', [])),
                    "count": len(df.get('Containers', [])),
                    "reclaimable": sum(c.get('SizeRw', 0) for c in df.get('Containers', []) if c.get('State') != 'running')
                },
                "volumes": {
                    "total_size": sum(v.get('UsageData', {}).get('Size', 0) for v in df.get('Volumes', [])),
                    "count": len(df.get('Volumes', [])),
                    "reclaimable": sum(v.get('UsageData', {}).get('Size', 0) for v in df.get('Volumes', []) if v.get('UsageData', {}).get('RefCount', 0) == 0)
                },
                "build_cache": {
                    "total_size": sum(b.get('Size', 0) for b in df.get('BuildCache', [])),
                    "count": len(df.get('BuildCache', [])),
                    "reclaimable": sum(b.get('Size', 0) for b in df.get('BuildCache', []))
                }
            }
        except Exception:
            return {"images": {}, "containers": {}, "volumes": {}, "build_cache": {}}
    
    def rename_container(self, container_id: str, new_name: str) -> Dict[str, str]:
        """Rename a container"""
        try:
            container = self.client.containers.get(container_id)
            container.rename(new_name)
            return {"status": "success", "message": f"Container renamed to {new_name}"}
        except NotFound:
            raise Exception(f"Container {container_id} not found")
        except APIError as e:
            raise Exception(f"Failed to rename container: {str(e)}")
    
    def tag_image(self, image_id: str, repository: str, tag: str = "latest") -> Dict[str, str]:
        """Tag a Docker image"""
        try:
            image = self.client.images.get(image_id)
            image.tag(repository, tag)
            return {"status": "success", "message": f"Image tagged as {repository}:{tag}"}
        except NotFound:
            raise Exception(f"Image {image_id} not found")
        except APIError as e:
            raise Exception(f"Failed to tag image: {str(e)}")
    
    def pull_image(self, repository: str, tag: str = "latest") -> Dict[str, str]:
        """Pull a Docker image"""
        try:
            image = self.client.images.pull(repository, tag)
            return {"status": "success", "message": f"Image {repository}:{tag} pulled", "id": image.short_id}
        except APIError as e:
            raise Exception(f"Failed to pull image: {str(e)}")
    
    def push_image(self, repository: str, tag: str = "latest") -> Dict[str, str]:
        """Push a Docker image"""
        try:
            self.client.images.push(repository, tag)
            return {"status": "success", "message": f"Image {repository}:{tag} pushed"}
        except APIError as e:
            raise Exception(f"Failed to push image: {str(e)}")
    
    def delete_image(self, image_id: str, force: bool = False) -> Dict[str, str]:
        """Delete a Docker image"""
        try:
            self.client.images.remove(image_id, force=force)
            return {"status": "success", "message": f"Image {image_id} deleted"}
        except NotFound:
            raise Exception(f"Image {image_id} not found")
        except APIError as e:
            raise Exception(f"Failed to delete image: {str(e)}")
    
    def prune_images(self, dangling_only: bool = True) -> Dict[str, Any]:
        """Prune unused Docker images"""
        try:
            filters = {"dangling": dangling_only}
            result = self.client.images.prune(filters=filters)
            return {
                "status": "success",
                "message": "Images pruned",
                "images_deleted": result.get('ImagesDeleted', []),
                "space_reclaimed": result.get('SpaceReclaimed', 0)
            }
        except APIError as e:
            raise Exception(f"Failed to prune images: {str(e)}")
    
    def delete_network(self, network_id: str) -> Dict[str, str]:
        """Delete a Docker network"""
        try:
            network = self.client.networks.get(network_id)
            network.remove()
            return {"status": "success", "message": f"Network {network_id} deleted"}
        except NotFound:
            raise Exception(f"Network {network_id} not found")
        except APIError as e:
            raise Exception(f"Failed to delete network: {str(e)}")
    
    def delete_volume(self, volume_name: str, force: bool = False) -> Dict[str, str]:
        """Delete a Docker volume"""
        try:
            volume = self.client.volumes.get(volume_name)
            volume.remove(force=force)
            return {"status": "success", "message": f"Volume {volume_name} deleted"}
        except NotFound:
            raise Exception(f"Volume {volume_name} not found")
        except APIError as e:
            raise Exception(f"Failed to delete volume: {str(e)}")
    
    def attach_volume_to_container(self, container_id: str, volume_name: str, mount_point: str, mode: str = "rw") -> Dict[str, str]:
        """Attach a volume to a container (requires container recreation)"""
        try:
            container = self.client.containers.get(container_id)
            attrs = container.attrs
            
            # Get current mounts
            mounts = attrs.get('Mounts', [])
            
            # Add new volume mount
            new_mount = {
                'Type': 'volume',
                'Source': volume_name,
                'Target': mount_point,
                'Mode': mode
            }
            
            # Check if already mounted
            for mount in mounts:
                if mount.get('Source') == volume_name:
                    raise Exception(f"Volume {volume_name} is already attached to this container")
            
            # Need to recreate container with new volume
            # Get current config
            config = attrs['Config']
            host_config = attrs['HostConfig']
            
            # Stop and remove old container
            was_running = container.status == 'running'
            if was_running:
                container.stop()
            container.remove()
            
            # Prepare volume binds
            volumes = {}
            binds = host_config.get('Binds', [])
            binds.append(f"{volume_name}:{mount_point}:{mode}")
            
            # Create new container
            new_container = self.client.containers.create(
                image=config['Image'],
                name=container.name,
                environment=config.get('Env', []),
                ports=host_config.get('PortBindings', {}),
                volumes={mount_point: {}},
                host_config=self.client.api.create_host_config(binds=binds)
            )
            
            if was_running:
                new_container.start()
            
            return {"status": "success", "message": f"Volume {volume_name} attached to container"}
        except NotFound:
            raise Exception(f"Container or volume not found")
        except APIError as e:
            raise Exception(f"Failed to attach volume: {str(e)}")
    
    def create_from_compose(self, compose_content: str) -> Dict[str, str]:
        """Create containers from docker-compose content"""
        try:
            # Create temporary directory for compose file
            with tempfile.TemporaryDirectory() as tmpdir:
                compose_file = Path(tmpdir) / "docker-compose.yml"
                compose_file.write_text(compose_content)
                
                # Run docker-compose up
                import subprocess
                result = subprocess.run(
                    ["docker-compose", "up", "-d"],
                    cwd=tmpdir,
                    capture_output=True,
                    text=True
                )
                
                if result.returncode != 0:
                    raise Exception(f"Failed to create containers: {result.stderr}")
                
                return {
                    "status": "success",
                    "message": "Container stack created successfully",
                    "output": result.stdout
                }
        except Exception as e:
            raise Exception(f"Failed to create from compose: {str(e)}")
    
    def build_image(self, dockerfile_content: str, tag: str) -> Dict[str, str]:
        """Build a Docker image from Dockerfile content"""
        try:
            # Create temporary directory for Dockerfile
            with tempfile.TemporaryDirectory() as tmpdir:
                dockerfile_path = Path(tmpdir) / "Dockerfile"
                dockerfile_path.write_text(dockerfile_content)
                
                # Build the image
                image, build_logs = self.client.images.build(
                    path=tmpdir,
                    tag=tag,
                    rm=True,
                    forcerm=True
                )
                
                # Collect build logs
                logs = []
                for log in build_logs:
                    if 'stream' in log:
                        logs.append(log['stream'].strip())
                
                return {
                    "status": "success",
                    "message": f"Image {tag} built successfully",
                    "image_id": image.short_id,
                    "logs": logs
                }
        except APIError as e:
            raise Exception(f"Failed to build image: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to build image: {str(e)}")


docker_service = DockerService()
