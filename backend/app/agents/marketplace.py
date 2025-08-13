"""
Agent Marketplace system for discovering, sharing, and installing agents.

Supports both self-hosted and managed instance deployments with
ability to create, share, and customize agents dynamically.
"""

from typing import List, Dict, Any, Optional, Union
from enum import Enum
from datetime import datetime
import json
import yaml
import hashlib
from pathlib import Path
from pydantic import BaseModel, Field, HttpUrl

from app.agents.engine.base import BaseAgent, AgentCapability
from app.agents.engine.registry import get_registry

import logging
logger = logging.getLogger(__name__)


class AgentSource(str, Enum):
    """Source of an agent package."""
    LOCAL = "local"           # Built-in or locally created
    MARKETPLACE = "marketplace"  # From Syna marketplace
    GITHUB = "github"         # From GitHub repository
    CUSTOM = "custom"         # Custom/private source
    TEMPLATE = "template"     # Generated from template


class AgentLicense(str, Enum):
    """Agent licensing models."""
    MIT = "mit"
    APACHE2 = "apache2"
    BSD = "bsd"
    PROPRIETARY = "proprietary"
    CUSTOM = "custom"


class AgentCategory(str, Enum):
    """Agent categories for marketplace organization."""
    PRODUCTIVITY = "productivity"
    DEVELOPMENT = "development"
    RESEARCH = "research"
    ANALYTICS = "analytics"
    COMMUNICATION = "communication"
    AUTOMATION = "automation"
    CREATIVE = "creative"
    OPERATIONS = "operations"
    CUSTOM = "custom"


class AgentVersion(BaseModel):
    """Represents a specific version of an agent."""
    version: str = Field(..., description="Semantic version (e.g., 1.0.0)")
    released_at: datetime = Field(default_factory=datetime.utcnow)
    changelog: str = Field(default="", description="Version changelog")
    min_syna_version: str = Field(default="0.1.0", description="Minimum Syna version required")
    dependencies: List[str] = Field(default_factory=list, description="Required dependencies")
    download_url: Optional[HttpUrl] = Field(None, description="Download URL for this version")
    checksum: Optional[str] = Field(None, description="SHA256 checksum for verification")


class AgentPackage(BaseModel):
    """
    Represents an agent package that can be installed.
    This is the core unit of distribution in the marketplace.
    """
    id: str = Field(..., description="Unique package identifier")
    name: str = Field(..., description="Human-readable name")
    description: str = Field(..., description="Detailed description")
    author: str = Field(..., description="Author or organization")
    category: AgentCategory = Field(..., description="Primary category")
    tags: List[str] = Field(default_factory=list, description="Searchable tags")
    
    # Versioning
    latest_version: str = Field(..., description="Latest stable version")
    versions: List[AgentVersion] = Field(default_factory=list, description="Available versions")
    
    # Capabilities and requirements
    capabilities: List[str] = Field(default_factory=list, description="Agent capabilities")
    required_tools: List[str] = Field(default_factory=list, description="Required external tools")
    
    # Configuration
    config_schema: Dict[str, Any] = Field(default_factory=dict, description="Configuration schema")
    default_config: Dict[str, Any] = Field(default_factory=dict, description="Default configuration")
    
    # Marketplace metadata
    source: AgentSource = Field(..., description="Source of the agent")
    license: AgentLicense = Field(..., description="License type")
    homepage: Optional[HttpUrl] = Field(None, description="Project homepage")
    repository: Optional[HttpUrl] = Field(None, description="Source repository")
    documentation: Optional[HttpUrl] = Field(None, description="Documentation URL")
    
    # Usage stats (for marketplace)
    downloads: int = Field(default=0, description="Total downloads")
    rating: float = Field(default=0.0, description="Average rating (0-5)")
    reviews_count: int = Field(default=0, description="Number of reviews")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Verification
    verified: bool = Field(default=False, description="Verified by Syna team")
    certification_level: Optional[str] = Field(None, description="Certification level if verified")


class AgentTemplate(BaseModel):
    """
    Template for creating custom agents quickly.
    Users can customize these templates for their specific needs.
    """
    id: str = Field(..., description="Template identifier")
    name: str = Field(..., description="Template name")
    description: str = Field(..., description="What this template creates")
    category: AgentCategory = Field(..., description="Agent category")
    
    # Base configuration
    base_prompt: str = Field(..., description="Base system prompt template")
    default_tools: List[str] = Field(default_factory=list, description="Default tools included")
    capabilities: List[str] = Field(default_factory=list, description="Capabilities provided")
    
    # Customization points
    variables: Dict[str, Any] = Field(default_factory=dict, description="Template variables")
    customization_schema: Dict[str, Any] = Field(default_factory=dict, description="What can be customized")
    
    # Examples
    example_configs: List[Dict[str, Any]] = Field(default_factory=list, description="Example configurations")
    use_cases: List[str] = Field(default_factory=list, description="Common use cases")


class AgentBuilder:
    """
    Builder for creating agents dynamically from templates or specifications.
    Supports both YAML-based and programmatic agent creation.
    """
    
    def __init__(self):
        self.templates: Dict[str, AgentTemplate] = {}
        self.packages: Dict[str, AgentPackage] = {}
    
    def create_from_template(
        self,
        template_id: str,
        customizations: Dict[str, Any],
        agent_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create an agent from a template with customizations.
        
        Args:
            template_id: Template to use
            customizations: Custom values for the template
            agent_id: Optional custom ID for the agent
            
        Returns:
            Agent configuration dictionary
        """
        template = self.templates.get(template_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")
        
        # Generate agent ID if not provided
        if not agent_id:
            agent_id = f"{template_id}_{datetime.utcnow().timestamp()}"
        
        # Build configuration
        config = {
            "id": agent_id,
            "name": customizations.get("name", template.name),
            "description": customizations.get("description", template.description),
            "category": template.category,
            "capabilities": template.capabilities,
            "tools": customizations.get("tools", template.default_tools),
            "prompt": self._render_prompt(template.base_prompt, customizations),
            "metadata": {
                "created_from": template_id,
                "created_at": datetime.utcnow().isoformat(),
                "customizations": customizations
            }
        }
        
        return config
    
    def create_from_yaml(self, yaml_content: str) -> Dict[str, Any]:
        """
        Create an agent from YAML specification.
        
        Args:
            yaml_content: YAML content defining the agent
            
        Returns:
            Agent configuration dictionary
        """
        try:
            config = yaml.safe_load(yaml_content)
            
            # Validate required fields
            required = ["id", "name", "description"]
            for field in required:
                if field not in config:
                    raise ValueError(f"Missing required field: {field}")
            
            # Add metadata
            config["metadata"] = config.get("metadata", {})
            config["metadata"]["created_at"] = datetime.utcnow().isoformat()
            config["metadata"]["source"] = "yaml"
            
            return config
            
        except yaml.YAMLError as e:
            raise ValueError(f"Invalid YAML: {e}")
    
    def _render_prompt(self, template: str, variables: Dict[str, Any]) -> str:
        """
        Render a prompt template with variables.
        
        Args:
            template: Prompt template with placeholders
            variables: Values to substitute
            
        Returns:
            Rendered prompt
        """
        prompt = template
        for key, value in variables.items():
            placeholder = f"{{{key}}}"
            if placeholder in prompt:
                prompt = prompt.replace(placeholder, str(value))
        return prompt
    
    def export_agent(self, agent_id: str, include_code: bool = False) -> Dict[str, Any]:
        """
        Export an agent for sharing or backup.
        
        Args:
            agent_id: Agent to export
            include_code: Whether to include implementation code
            
        Returns:
            Exportable agent package
        """
        registry = get_registry()
        agent_info = registry.get_info(agent_id)
        
        if not agent_info:
            raise ValueError(f"Agent {agent_id} not found")
        
        package = {
            "format_version": "1.0",
            "exported_at": datetime.utcnow().isoformat(),
            "agent": {
                "id": agent_id,
                "info": agent_info,
                "config": agent_info.get("config", {})
            }
        }
        
        if include_code:
            # Include the actual implementation
            agent_class = registry.get_agent_class(agent_id)
            if agent_class:
                package["agent"]["implementation"] = {
                    "module": agent_class.__module__,
                    "class": agent_class.__name__,
                    # Could include source code here if needed
                }
        
        return package
    
    def import_agent(self, package: Dict[str, Any], override_id: Optional[str] = None) -> str:
        """
        Import an agent from an exported package.
        
        Args:
            package: Exported agent package
            override_id: Optional ID override
            
        Returns:
            Imported agent ID
        """
        if package.get("format_version") != "1.0":
            raise ValueError("Unsupported package format")
        
        agent_data = package.get("agent", {})
        agent_id = override_id or agent_data.get("id")
        
        if not agent_id:
            raise ValueError("Agent ID required")
        
        # Create configuration
        config = agent_data.get("config", {})
        config["imported_at"] = datetime.utcnow().isoformat()
        
        # Store in appropriate location based on deployment type
        self._store_agent_config(agent_id, config)
        
        return agent_id
    
    def _store_agent_config(self, agent_id: str, config: Dict[str, Any]) -> None:
        """
        Store agent configuration to disk.
        
        Args:
            agent_id: Agent identifier
            config: Agent configuration
        """
        # Define storage path
        config_dir = Path("app/agents/definitions")
        config_dir.mkdir(parents=True, exist_ok=True)
        
        config_file = config_dir / f"{agent_id}.yaml"
        
        with open(config_file, 'w') as f:
            yaml.dump(config, f, default_flow_style=False)
        
        logger.info(f"Stored agent config: {config_file}")


class MarketplaceService:
    """
    Service for interacting with the agent marketplace.
    Handles discovery, installation, and management of agents.
    """
    
    def __init__(self, marketplace_url: Optional[str] = None):
        """
        Initialize marketplace service.
        
        Args:
            marketplace_url: URL of the marketplace API (for managed instances)
        """
        self.marketplace_url = marketplace_url
        self.builder = AgentBuilder()
        self.local_packages: Dict[str, AgentPackage] = {}
        self.installed_agents: Dict[str, str] = {}  # agent_id -> version
    
    async def search(
        self,
        query: Optional[str] = None,
        category: Optional[AgentCategory] = None,
        tags: Optional[List[str]] = None,
        verified_only: bool = False
    ) -> List[AgentPackage]:
        """
        Search for agents in the marketplace.
        
        Args:
            query: Search query
            category: Filter by category
            tags: Filter by tags
            verified_only: Only return verified agents
            
        Returns:
            List of matching agent packages
        """
        results = []
        
        # Search local packages first
        for package in self.local_packages.values():
            if verified_only and not package.verified:
                continue
            
            if category and package.category != category:
                continue
            
            if tags and not any(tag in package.tags for tag in tags):
                continue
            
            if query:
                # Simple text search
                search_text = f"{package.name} {package.description} {' '.join(package.tags)}".lower()
                if query.lower() not in search_text:
                    continue
            
            results.append(package)
        
        # If connected to marketplace, search remote
        if self.marketplace_url:
            # TODO: Implement remote marketplace search
            pass
        
        # Sort by relevance (downloads + rating)
        results.sort(key=lambda p: (p.downloads * 0.3 + p.rating * 100), reverse=True)
        
        return results
    
    async def install(
        self,
        package_id: str,
        version: Optional[str] = None,
        force: bool = False
    ) -> bool:
        """
        Install an agent package.
        
        Args:
            package_id: Package to install
            version: Specific version (latest if None)
            force: Force reinstall even if already installed
            
        Returns:
            True if successful
        """
        # Check if already installed
        if package_id in self.installed_agents and not force:
            logger.info(f"Agent {package_id} already installed")
            return True
        
        # Get package
        package = await self._fetch_package(package_id)
        if not package:
            raise ValueError(f"Package {package_id} not found")
        
        # Determine version
        if not version:
            version = package.latest_version
        
        # Find version info
        version_info = next(
            (v for v in package.versions if v.version == version),
            None
        )
        
        if not version_info:
            raise ValueError(f"Version {version} not found for {package_id}")
        
        # Download and install
        try:
            # Create agent configuration
            config = {
                "id": package_id,
                "name": package.name,
                "description": package.description,
                "version": version,
                "capabilities": package.capabilities,
                "config": package.default_config,
                "metadata": {
                    "installed_at": datetime.utcnow().isoformat(),
                    "source": package.source,
                    "package_id": package.id
                }
            }
            
            # Store configuration
            self.builder._store_agent_config(package_id, config)
            
            # Register with the system
            registry = get_registry()
            registry.load_from_directory(Path("app/agents/definitions"))
            
            # Track installation
            self.installed_agents[package_id] = version
            
            logger.info(f"Successfully installed {package_id} v{version}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to install {package_id}: {e}")
            return False
    
    async def uninstall(self, package_id: str) -> bool:
        """
        Uninstall an agent package.
        
        Args:
            package_id: Package to uninstall
            
        Returns:
            True if successful
        """
        if package_id not in self.installed_agents:
            logger.warning(f"Agent {package_id} not installed")
            return False
        
        try:
            # Remove configuration
            config_file = Path(f"app/agents/definitions/{package_id}.yaml")
            if config_file.exists():
                config_file.unlink()
            
            # Unregister from system
            registry = get_registry()
            registry.unregister(package_id)
            
            # Remove from tracking
            del self.installed_agents[package_id]
            
            logger.info(f"Successfully uninstalled {package_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to uninstall {package_id}: {e}")
            return False
    
    async def _fetch_package(self, package_id: str) -> Optional[AgentPackage]:
        """
        Fetch package information.
        
        Args:
            package_id: Package identifier
            
        Returns:
            Package information or None
        """
        # Check local packages
        if package_id in self.local_packages:
            return self.local_packages[package_id]
        
        # If connected to marketplace, fetch from remote
        if self.marketplace_url:
            # TODO: Implement remote fetch
            pass
        
        return None
    
    def create_package(
        self,
        agent_id: str,
        metadata: Dict[str, Any]
    ) -> AgentPackage:
        """
        Create a new agent package for distribution.
        
        Args:
            agent_id: Agent to package
            metadata: Package metadata
            
        Returns:
            Created package
        """
        registry = get_registry()
        agent_info = registry.get_info(agent_id)
        
        if not agent_info:
            raise ValueError(f"Agent {agent_id} not found")
        
        package = AgentPackage(
            id=agent_id,
            name=metadata.get("name", agent_info["name"]),
            description=metadata.get("description", agent_info["description"]),
            author=metadata.get("author", "Unknown"),
            category=metadata.get("category", AgentCategory.CUSTOM),
            latest_version=metadata.get("version", "0.1.0"),
            capabilities=agent_info["capabilities"],
            source=AgentSource.LOCAL,
            license=metadata.get("license", AgentLicense.MIT),
            config_schema=metadata.get("config_schema", {}),
            default_config=agent_info["config"]
        )
        
        # Add initial version
        package.versions.append(AgentVersion(
            version=package.latest_version,
            changelog="Initial release"
        ))
        
        # Store locally
        self.local_packages[package.id] = package
        
        return package