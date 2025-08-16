import { ComponentType, lazy, LazyExoticComponent } from 'react';

/**
 * Enhanced lazy loading with preload capability
 * Allows components to be preloaded before they're needed
 */
export interface PreloadableComponent<T extends ComponentType<any>>
  extends LazyExoticComponent<T> {
  preload: () => Promise<{ default: T }>;
}

export function lazyWithPreload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): PreloadableComponent<T> {
  const Component = lazy(factory) as PreloadableComponent<T>;
  Component.preload = factory;
  return Component;
}

/**
 * Preload components on hover or when likely to be needed
 */
export function preloadComponent(component: PreloadableComponent<any>) {
  component.preload();
}

/**
 * Preload multiple components in parallel
 */
export function preloadComponents(components: PreloadableComponent<any>[]) {
  return Promise.all(components.map(c => c.preload()));
}