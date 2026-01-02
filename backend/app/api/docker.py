from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List
import io

from app.core.security import get_current_active_user
from app.models.user import User
from app.services.docker_service import docker_service
from app.schemas.docker import (
    ContainerInfo,
    ContainerDetail,
    ContainerUpdate,
    ContainerRename,
    NetworkCreate,
    VolumeCreate,
    VolumeAttach,
    VolumeDelete,
    ImageExport,
    ImageTag,
    ImagePull,
    ImagePush,
    ImageDelete,
    ImagePrune,
    ComposeUpdate,
    ComposeCreate,
    ImageBuild,
    DockerSystemInfo
)
from app.db.redis_client import redis_client

router = APIRouter()


@router.get("/system", response_model=DockerSystemInfo)
async def get_system_info(current_user: User = Depends(get_current_active_user)):
    """Get Docker system information"""
    try:
        # Try to get from cache
        cached = await redis_client.get("docker:system_info")
        if cached:
            return cached
        
        info = docker_service.get_system_info()
        
        # Cache for 30 seconds
        await redis_client.set("docker:system_info", info, expire=30)
        
        return info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/containers", response_model=List[ContainerInfo])
async def list_containers(
    all: bool = True,
    current_user: User = Depends(get_current_active_user)
):
    """List all Docker containers"""
    try:
        containers = docker_service.list_containers(all=all)
        return containers
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/containers/{container_id}", response_model=ContainerDetail)
async def get_container_details(
    container_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get detailed information about a container"""
    try:
        details = docker_service.get_container_details(container_id)
        return details
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/containers/{container_id}/start")
async def start_container(
    container_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Start a container"""
    try:
        result = docker_service.start_container(container_id)
        await redis_client.delete("docker:system_info")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/containers/{container_id}/stop")
async def stop_container(
    container_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Stop a container"""
    try:
        result = docker_service.stop_container(container_id)
        await redis_client.delete("docker:system_info")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/containers/{container_id}/restart")
async def restart_container(
    container_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Restart a container"""
    try:
        result = docker_service.restart_container(container_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/containers/{container_id}")
async def remove_container(
    container_id: str,
    force: bool = False,
    current_user: User = Depends(get_current_active_user)
):
    """Remove a container"""
    try:
        result = docker_service.remove_container(container_id, force=force)
        await redis_client.delete("docker:system_info")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/containers/{container_id}")
async def update_container(
    container_id: str,
    updates: ContainerUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update container configuration"""
    try:
        result = docker_service.update_container(
            container_id,
            updates.dict(exclude_none=True)
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/containers/{container_id}/compose")
async def get_compose_file(
    container_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get docker-compose.yml content for a container"""
    try:
        content = docker_service.get_compose_file(container_id)
        if content is None:
            raise HTTPException(
                status_code=404,
                detail="Container was not started with docker-compose"
            )
        return {"content": content}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/containers/{container_id}/compose")
async def update_compose_file(
    container_id: str,
    compose_data: ComposeUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update docker-compose.yml and recreate container"""
    try:
        result = docker_service.update_compose_file(container_id, compose_data.compose_content)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/containers/{container_id}/networks/{network_name}")
async def connect_to_network(
    container_id: str,
    network_name: str,
    current_user: User = Depends(get_current_active_user)
):
    """Connect container to a network"""
    try:
        result = docker_service.connect_container_to_network(container_id, network_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/containers/{container_id}/networks/{network_name}")
async def disconnect_from_network(
    container_id: str,
    network_name: str,
    current_user: User = Depends(get_current_active_user)
):
    """Disconnect container from a network"""
    try:
        result = docker_service.disconnect_container_from_network(container_id, network_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/networks")
async def list_networks(current_user: User = Depends(get_current_active_user)):
    """List all Docker networks"""
    try:
        networks = docker_service.list_networks()
        return networks
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/networks")
async def create_network(
    network_data: NetworkCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new Docker network"""
    try:
        result = docker_service.create_network(
            name=network_data.name,
            driver=network_data.driver,
            options=network_data.options
        )
        await redis_client.delete("docker:system_info")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/volumes")
async def list_volumes(current_user: User = Depends(get_current_active_user)):
    """List all Docker volumes"""
    try:
        volumes = docker_service.list_volumes()
        return volumes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/volumes")
async def create_volume(
    volume_data: VolumeCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new Docker volume"""
    try:
        result = docker_service.create_volume(
            name=volume_data.name,
            driver=volume_data.driver,
            options=volume_data.options,
            host_path=volume_data.host_path
        )
        await redis_client.delete("docker:system_info")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/images")
async def list_images(current_user: User = Depends(get_current_active_user)):
    """List all Docker images"""
    try:
        images = docker_service.list_images()
        return images
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/images/export")
async def export_image(
    image_data: ImageExport,
    current_user: User = Depends(get_current_active_user)
):
    """Export a Docker image"""
    try:
        image_bytes = docker_service.export_image(image_data.image_name, image_data.tag)
        
        # Convert generator to bytes
        data = b""
        for chunk in image_bytes:
            data += chunk
        
        filename = f"{image_data.image_name.replace('/', '_')}_{image_data.tag}.tar"
        
        return StreamingResponse(
            io.BytesIO(data),
            media_type="application/x-tar",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/images/import")
async def import_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Import a Docker image"""
    try:
        image_data = await file.read()
        result = docker_service.import_image(image_data)
        await redis_client.delete("docker:system_info")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/containers/{container_id}/rename")
async def rename_container(
    container_id: str,
    rename_data: ContainerRename,
    current_user: User = Depends(get_current_active_user)
):
    """Rename a container"""
    try:
        result = docker_service.rename_container(container_id, rename_data.new_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/containers/{container_id}/volumes")
async def attach_volume(
    container_id: str,
    volume_data: VolumeAttach,
    current_user: User = Depends(get_current_active_user)
):
    """Attach a volume to a container"""
    try:
        result = docker_service.attach_volume_to_container(
            container_id,
            volume_data.volume_name,
            volume_data.mount_point,
            volume_data.mode
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/images/{image_id}/tag")
async def tag_image(
    image_id: str,
    tag_data: ImageTag,
    current_user: User = Depends(get_current_active_user)
):
    """Tag a Docker image"""
    try:
        result = docker_service.tag_image(image_id, tag_data.repository, tag_data.tag)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/images/pull")
async def pull_image(
    pull_data: ImagePull,
    current_user: User = Depends(get_current_active_user)
):
    """Pull a Docker image"""
    try:
        result = docker_service.pull_image(pull_data.repository, pull_data.tag)
        await redis_client.delete("docker:system_info")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/images/push")
async def push_image(
    push_data: ImagePush,
    current_user: User = Depends(get_current_active_user)
):
    """Push a Docker image"""
    try:
        result = docker_service.push_image(push_data.repository, push_data.tag)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/images/{image_id}")
async def delete_image(
    image_id: str,
    force: bool = False,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a Docker image"""
    try:
        result = docker_service.delete_image(image_id, force=force)
        await redis_client.delete("docker:system_info")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/images/prune")
async def prune_images(
    prune_data: ImagePrune,
    current_user: User = Depends(get_current_active_user)
):
    """Prune unused Docker images"""
    try:
        result = docker_service.prune_images(prune_data.dangling_only)
        await redis_client.delete("docker:system_info")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/networks/{network_id}")
async def delete_network(
    network_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a Docker network"""
    try:
        result = docker_service.delete_network(network_id)
        await redis_client.delete("docker:system_info")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/volumes/{volume_name}")
async def delete_volume(
    volume_name: str,
    force: bool = False,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a Docker volume"""
    try:
        result = docker_service.delete_volume(volume_name, force=force)
        await redis_client.delete("docker:system_info")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compose/up")
async def create_from_compose(
    compose_data: ComposeCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create containers from docker-compose content"""
    try:
        result = docker_service.create_from_compose(compose_data.compose_file)
        await redis_client.delete("docker:system_info")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/images/build")
async def build_image(
    build_data: ImageBuild,
    current_user: User = Depends(get_current_active_user)
):
    """Build a Docker image from Dockerfile content"""
    try:
        result = docker_service.build_image(
            build_data.dockerfile_content,
            build_data.tag
        )
        await redis_client.delete("docker:system_info")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
