"""
Agent Marketplace API endpoints.

Provides endpoints for discovering, installing, and managing agents
from the marketplace or local templates.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Depends, BackgroundTasks
from pydantic import BaseModel, Field

from pathlib import Path

from app.agents.marketplace import (
    MarketplaceService, AgentPackage, AgentTemplate,
    AgentCategory, AgentSource, AgentBuilder
)
from app.agents.engine.registry import get_registry
from app.agents.engine.base import AgentCapability

router = APIRouter()

# Initialize marketplace service
marketplace = MarketplaceService()
builder = AgentBuilder()


class AgentSearchRequest(BaseModel):
    """Search request for agents."""
    query: Optional[str] = Field(None, description="Search query")
    category: Optional[AgentCategory] = Field(None, description="Filter by category")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    verified_only: bool = Field(False, description="Only show verified agents")
    limit: int = Field(20, ge=1, le=100, description="Maximum results")
    offset: int = Field(0, ge=0, description="Result offset for pagination")


class AgentInstallRequest(BaseModel):
    """Request to install an agent."""
    package_id: str = Field(..., description="Package to install")
    version: Optional[str] = Field(None, description="Specific version (latest if None)")
    force: bool = Field(False, description="Force reinstall")
    auto_enable: bool = Field(True, description="Automatically enable after installation")


class AgentCreateRequest(BaseModel):
    """Request to create a custom agent."""
    name: str = Field(..., description="Agent name")
    description: str = Field(..., description="Agent description")
    template_id: Optional[str] = Field(None, description="Template to use")
    prompt: Optional[str] = Field(None, description="System prompt")
    tools: List[str] = Field(default_factory=list, description="Tools to include")
    capabilities: List[str] = Field(default_factory=list, description="Agent capabilities")
    config: Dict[str, Any] = Field(default_factory=dict, description="Additional configuration")


class AgentExportRequest(BaseModel):
    """Request to export an agent."""
    agent_id: str = Field(..., description="Agent to export")
    include_code: bool = Field(False, description="Include implementation code")
    format: str = Field("yaml", description="Export format (yaml, json, package)")


@router.get("/search", response_model=List[Dict[str, Any]])
async def search_agents(
    query: Optional[str] = Query(None, description="Search query"),
    category: Optional[AgentCategory] = Query(None, description="Filter by category"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    verified_only: bool = Query(False, description="Only verified agents"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """
    Search for agents in the marketplace.
    
    Returns available agents matching the search criteria.
    """
    results = await marketplace.search(
        query=query,
        category=category,
        tags=tags,
        verified_only=verified_only
    )
    
    # Apply pagination
    paginated = results[offset:offset + limit]
    
    return [
        {
            "id": pkg.id,
            "name": pkg.name,
            "description": pkg.description,
            "category": pkg.category,
            "author": pkg.author,
            "version": pkg.latest_version,
            "rating": pkg.rating,
            "downloads": pkg.downloads,
            "verified": pkg.verified,
            "capabilities": pkg.capabilities,
            "tags": pkg.tags
        }
        for pkg in paginated
    ]


@router.get("/featured", response_model=List[Dict[str, Any]])
async def get_featured_agents():
    """
    Get featured agents curated by the Syna team.
    
    Returns a list of high-quality, verified agents.
    """
    # Get all verified agents
    featured = await marketplace.search(verified_only=True)
    
    # Sort by rating and downloads
    featured.sort(key=lambda p: (p.rating * p.downloads), reverse=True)
    
    # Return top 10
    return [
        {
            "id": pkg.id,
            "name": pkg.name,
            "description": pkg.description,
            "category": pkg.category,
            "author": pkg.author,
            "rating": pkg.rating,
            "reason": "High rating and popular"
        }
        for pkg in featured[:10]
    ]


@router.get("/categories", response_model=List[Dict[str, Any]])
async def get_categories():
    """Get all available agent categories with counts."""
    categories = {}
    
    # Count agents per category
    all_agents = await marketplace.search()
    for agent in all_agents:
        cat = agent.category.value
        if cat not in categories:
            categories[cat] = {
                "name": cat,
                "display_name": cat.replace("_", " ").title(),
                "count": 0
            }
        categories[cat]["count"] += 1
    
    return list(categories.values())


@router.get("/installed", response_model=List[Dict[str, Any]])
async def get_installed_agents():
    """Get list of currently installed agents."""
    registry = get_registry()
    installed = []
    
    for agent_id in registry.list_agents():
        info = registry.get_info(agent_id)
        if info:
            installed.append({
                "id": agent_id,
                "name": info.get("name", agent_id),
                "description": info.get("description", ""),
                "version": marketplace.installed_agents.get(agent_id, "unknown"),
                "capabilities": info.get("capabilities", []),
                "enabled": True  # TODO: Track enabled state
            })
    
    return installed


@router.get("/templates", response_model=List[Dict[str, Any]])
async def get_templates():
    """Get available agent templates for quick customization."""
    # Return built-in templates
    templates = [
        {
            "id": "assistant",
            "name": "General Assistant",
            "description": "A helpful AI assistant for general tasks",
            "category": "productivity",
            "variables": ["personality", "expertise", "tone"]
        },
        {
            "id": "researcher",
            "name": "Research Specialist",
            "description": "Specialized in finding and analyzing information",
            "category": "research",
            "variables": ["domains", "sources", "depth"]
        },
        {
            "id": "coder",
            "name": "Code Assistant",
            "description": "Helps with programming and development tasks",
            "category": "development",
            "variables": ["languages", "frameworks", "style"]
        },
        {
            "id": "analyst",
            "name": "Data Analyst",
            "description": "Analyzes data and provides insights",
            "category": "analytics",
            "variables": ["metrics", "visualization", "reporting"]
        },
        {
            "id": "creative",
            "name": "Creative Writer",
            "description": "Assists with creative writing and content",
            "category": "creative",
            "variables": ["genre", "style", "audience"]
        }
    ]
    
    return templates


@router.get("/agent/{agent_id}", response_model=Dict[str, Any])
async def get_agent_details(agent_id: str):
    """Get detailed information about a specific agent."""
    # Check if installed
    registry = get_registry()
    info = registry.get_info(agent_id)
    
    if info:
        return {
            "id": agent_id,
            "installed": True,
            "info": info,
            "version": marketplace.installed_agents.get(agent_id, "unknown")
        }
    
    # Check marketplace
    package = await marketplace._fetch_package(agent_id)
    if package:
        return {
            "id": agent_id,
            "installed": False,
            "package": package.dict()
        }
    
    raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")


@router.post("/install")
async def install_agent(
    request: AgentInstallRequest,
    background_tasks: BackgroundTasks
):
    """
    Install an agent from the marketplace.
    
    Downloads and installs the specified agent package.
    """
    try:
        # Install in background for large packages
        if request.force or request.package_id not in marketplace.installed_agents:
            background_tasks.add_task(
                marketplace.install,
                request.package_id,
                request.version,
                request.force
            )
            
            return {
                "status": "installing",
                "message": f"Installing {request.package_id}...",
                "package_id": request.package_id
            }
        else:
            return {
                "status": "already_installed",
                "message": f"{request.package_id} is already installed",
                "package_id": request.package_id
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/uninstall/{agent_id}")
async def uninstall_agent(agent_id: str):
    """Uninstall an agent."""
    success = await marketplace.uninstall(agent_id)
    
    if success:
        return {
            "status": "success",
            "message": f"Uninstalled {agent_id}"
        }
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to uninstall {agent_id}"
        )


@router.post("/create")
async def create_custom_agent(request: AgentCreateRequest):
    """
    Create a custom agent from scratch or template.
    
    Allows users to quickly create customized agents.
    """
    try:
        if request.template_id:
            # Create from template
            config = builder.create_from_template(
                template_id=request.template_id,
                customizations={
                    "name": request.name,
                    "description": request.description,
                    "tools": request.tools,
                    **request.config
                }
            )
        else:
            # Create from scratch
            config = {
                "id": f"custom_{request.name.lower().replace(' ', '_')}",
                "name": request.name,
                "description": request.description,
                "prompt": request.prompt or "You are a helpful AI assistant.",
                "tools": request.tools,
                "capabilities": request.capabilities,
                "config": request.config,
                "metadata": {
                    "source": "custom",
                    "created_via": "api"
                }
            }
        
        # Store the configuration
        builder._store_agent_config(config["id"], config)
        
        # Register with system
        registry = get_registry()
        registry.load_from_directory(Path("app/agents/definitions"))
        
        return {
            "status": "success",
            "agent_id": config["id"],
            "message": f"Created custom agent: {config['name']}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export")
async def export_agent(request: AgentExportRequest):
    """
    Export an agent for sharing or backup.
    
    Exports agent configuration and optionally code.
    """
    try:
        package = builder.export_agent(
            agent_id=request.agent_id,
            include_code=request.include_code
        )
        
        if request.format == "yaml":
            import yaml
            content = yaml.dump(package, default_flow_style=False)
            media_type = "application/yaml"
        else:  # json
            import json
            content = json.dumps(package, indent=2, default=str)
            media_type = "application/json"
        
        return {
            "format": request.format,
            "content": content,
            "media_type": media_type,
            "filename": f"{request.agent_id}_export.{request.format}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import")
async def import_agent(
    package: Dict[str, Any],
    override_id: Optional[str] = None
):
    """
    Import an agent from an exported package.
    
    Imports a previously exported agent configuration.
    """
    try:
        agent_id = builder.import_agent(package, override_id)
        
        # Register with system
        registry = get_registry()
        registry.load_from_directory(Path("app/agents/definitions"))
        
        return {
            "status": "success",
            "agent_id": agent_id,
            "message": f"Successfully imported agent: {agent_id}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
async def validate_agent_config(config: Dict[str, Any]):
    """
    Validate an agent configuration.
    
    Checks if the configuration is valid before installation.
    """
    required_fields = ["id", "name", "description"]
    errors = []
    
    for field in required_fields:
        if field not in config:
            errors.append(f"Missing required field: {field}")
    
    # Check tools exist
    if "tools" in config:
        # TODO: Validate tools against available tools
        pass
    
    # Check capabilities are valid
    if "capabilities" in config:
        valid_capabilities = [c.value for c in AgentCapability]
        for cap in config["capabilities"]:
            if cap not in valid_capabilities:
                errors.append(f"Invalid capability: {cap}")
    
    if errors:
        return {
            "valid": False,
            "errors": errors
        }
    else:
        return {
            "valid": True,
            "message": "Configuration is valid"
        }


@router.get("/updates")
async def check_for_updates():
    """Check for updates to installed agents."""
    updates = []
    
    for agent_id, current_version in marketplace.installed_agents.items():
        package = await marketplace._fetch_package(agent_id)
        if package and package.latest_version != current_version:
            updates.append({
                "agent_id": agent_id,
                "current_version": current_version,
                "latest_version": package.latest_version,
                "changelog": next(
                    (v.changelog for v in package.versions 
                     if v.version == package.latest_version),
                    ""
                )
            })
    
    return {
        "updates_available": len(updates) > 0,
        "updates": updates
    }