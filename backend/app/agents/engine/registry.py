"""
Agent Registry for discovery and registration of agents.

Provides a centralized registry for all available agents,
enabling dynamic discovery and instantiation.
"""

from typing import Dict, List, Optional, Type, Any
import logging
from pathlib import Path
import yaml
import importlib
import inspect

from app.agents.engine.base import BaseAgent, AgentCapability

logger = logging.getLogger(__name__)


class AgentRegistry:
    """
    Central registry for all agents in the system.
    
    Handles:
    - Agent registration and discovery
    - Dynamic agent instantiation
    - Capability-based agent selection
    - Configuration management
    """
    
    def __init__(self):
        """Initialize the agent registry."""
        self._agents: Dict[str, Type[BaseAgent]] = {}
        self._configs: Dict[str, Dict[str, Any]] = {}
        self._instances: Dict[str, BaseAgent] = {}
        
    def register(
        self,
        agent_id: str,
        agent_class: Type[BaseAgent],
        config: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Register an agent class.
        
        Args:
            agent_id: Unique identifier for the agent
            agent_class: The agent class to register
            config: Optional configuration for the agent
        """
        if not issubclass(agent_class, BaseAgent):
            raise ValueError(f"{agent_class} must be a subclass of BaseAgent")
        
        if agent_id in self._agents:
            logger.warning(f"Overwriting existing agent: {agent_id}")
        
        self._agents[agent_id] = agent_class
        if config:
            self._configs[agent_id] = config
        
        logger.info(f"Registered agent: {agent_id} ({agent_class.__name__})")
    
    def unregister(self, agent_id: str) -> None:
        """
        Unregister an agent.
        
        Args:
            agent_id: The agent to unregister
        """
        if agent_id in self._agents:
            del self._agents[agent_id]
            if agent_id in self._configs:
                del self._configs[agent_id]
            if agent_id in self._instances:
                del self._instances[agent_id]
            logger.info(f"Unregistered agent: {agent_id}")
    
    def get_agent_class(self, agent_id: str) -> Optional[Type[BaseAgent]]:
        """
        Get an agent class by ID.
        
        Args:
            agent_id: The agent ID
            
        Returns:
            The agent class or None if not found
        """
        return self._agents.get(agent_id)
    
    def get_agent_instance(
        self,
        agent_id: str,
        **override_config
    ) -> Optional[BaseAgent]:
        """
        Get or create an agent instance.
        
        Args:
            agent_id: The agent ID
            **override_config: Configuration overrides
            
        Returns:
            The agent instance or None if not found
        """
        # Check if instance already exists
        if agent_id in self._instances and not override_config:
            return self._instances[agent_id]
        
        # Get the agent class
        agent_class = self._agents.get(agent_id)
        if not agent_class:
            logger.error(f"Agent not found: {agent_id}")
            return None
        
        # Merge configurations
        config = self._configs.get(agent_id, {}).copy()
        config.update(override_config)
        
        try:
            # Create new instance
            instance = agent_class(agent_id=agent_id, **config)
            
            # Cache if no overrides
            if not override_config:
                self._instances[agent_id] = instance
            
            return instance
            
        except Exception as e:
            logger.error(f"Failed to instantiate agent {agent_id}: {e}")
            return None
    
    def list_agents(self) -> List[str]:
        """
        List all registered agent IDs.
        
        Returns:
            List of agent IDs
        """
        return list(self._agents.keys())
    
    def list_agents_by_capability(
        self,
        capability: AgentCapability
    ) -> List[str]:
        """
        List agents with a specific capability.
        
        Args:
            capability: The capability to search for
            
        Returns:
            List of agent IDs with the capability
        """
        matching_agents = []
        
        for agent_id in self._agents:
            instance = self.get_agent_instance(agent_id)
            if instance and instance.has_capability(capability):
                matching_agents.append(agent_id)
        
        return matching_agents
    
    def load_from_directory(self, directory: Path) -> None:
        """
        Load agent configurations from a directory.
        
        Args:
            directory: Path to the directory containing agent configs
        """
        if not directory.exists():
            logger.warning(f"Directory does not exist: {directory}")
            return
        
        # Load YAML configurations
        for yaml_file in directory.glob("*.yaml"):
            try:
                with open(yaml_file, 'r') as f:
                    config = yaml.safe_load(f)
                
                if not config:
                    continue
                
                agent_id = config.get('id', yaml_file.stem)
                
                # Try to import the corresponding agent class
                module_name = config.get('module', f"app.agents.engine.{yaml_file.stem}")
                class_name = config.get('class', f"{yaml_file.stem.title()}Agent")
                
                try:
                    module = importlib.import_module(module_name)
                    agent_class = getattr(module, class_name)
                    
                    # Register the agent
                    self.register(agent_id, agent_class, config)
                    
                except (ImportError, AttributeError) as e:
                    logger.warning(f"Could not load agent class for {agent_id}: {e}")
                    # Store config for later use even if class not found
                    self._configs[agent_id] = config
                    
            except Exception as e:
                logger.error(f"Failed to load config from {yaml_file}: {e}")
    
    def auto_discover(self) -> None:
        """
        Auto-discover and register agents from the engine module.
        """
        import app.agents.engine as engine_module
        
        # Get all modules in the engine package
        engine_path = Path(engine_module.__file__).parent
        
        for py_file in engine_path.glob("*.py"):
            if py_file.stem in ['__init__', 'base', 'registry']:
                continue
            
            module_name = f"app.agents.engine.{py_file.stem}"
            
            try:
                module = importlib.import_module(module_name)
                
                # Find all BaseAgent subclasses in the module
                for name, obj in inspect.getmembers(module):
                    if (inspect.isclass(obj) and 
                        issubclass(obj, BaseAgent) and 
                        obj != BaseAgent):
                        
                        # Generate agent ID from class name
                        agent_id = py_file.stem
                        
                        # Check if config exists
                        config_file = engine_path.parent / "definitions" / f"{agent_id}.yaml"
                        config = {}
                        
                        if config_file.exists():
                            with open(config_file, 'r') as f:
                                config = yaml.safe_load(f) or {}
                        
                        # Register the agent
                        self.register(agent_id, obj, config)
                        break  # Only one agent per module
                        
            except Exception as e:
                logger.warning(f"Could not auto-discover from {module_name}: {e}")
    
    def get_info(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """
        Get information about an agent.
        
        Args:
            agent_id: The agent ID
            
        Returns:
            Agent information or None if not found
        """
        agent_class = self._agents.get(agent_id)
        if not agent_class:
            return None
        
        config = self._configs.get(agent_id, {})
        
        # Try to get an instance to extract capabilities
        instance = self.get_agent_instance(agent_id)
        
        return {
            "id": agent_id,
            "class": agent_class.__name__,
            "module": agent_class.__module__,
            "name": config.get("name", agent_id),
            "description": config.get("description", agent_class.__doc__),
            "capabilities": [cap.value for cap in instance.get_capabilities()] if instance else [],
            "config": config
        }
    
    def clear(self) -> None:
        """Clear all registered agents."""
        self._agents.clear()
        self._configs.clear()
        self._instances.clear()
        logger.info("Cleared agent registry")


# Global registry instance
registry = AgentRegistry()


def get_registry() -> AgentRegistry:
    """Get the global agent registry."""
    return registry


def register_agent(
    agent_id: str,
    agent_class: Type[BaseAgent],
    config: Optional[Dict[str, Any]] = None
) -> None:
    """
    Convenience function to register an agent with the global registry.
    
    Args:
        agent_id: Unique identifier for the agent
        agent_class: The agent class to register
        config: Optional configuration for the agent
    """
    registry.register(agent_id, agent_class, config)


def get_agent(agent_id: str, **config) -> Optional[BaseAgent]:
    """
    Convenience function to get an agent from the global registry.
    
    Args:
        agent_id: The agent ID
        **config: Configuration overrides
        
    Returns:
        The agent instance or None if not found
    """
    return registry.get_agent_instance(agent_id, **config)