// tsfox/cli/interfaces/docker.interface.ts
import { GeneratorContext } from './cli.interface';

/**
 * Docker configuration interface
 */
export interface DockerConfigInterface {
  dockerfile: DockerfileConfig;
  compose: ComposeConfig;
  registry?: RegistryConfig;
  build: BuildConfig;
  development: DevConfig;
}

/**
 * Dockerfile configuration
 */
export interface DockerfileConfig {
  baseImage: string;
  nodeVersion: string;
  workdir: string;
  port: number;
  healthCheck?: HealthCheckConfig;
  user?: string;
  environment?: Record<string, string>;
  volumes?: VolumeMount[];
}

/**
 * Docker Compose configuration
 */
export interface ComposeConfig {
  version: string;
  services: Record<string, ServiceConfig>;
  networks?: Record<string, NetworkConfig>;
  volumes?: Record<string, VolumeConfig>;
}

/**
 * Build configuration
 */
export interface BuildConfig {
  context: string;
  target?: string;
  args?: Record<string, string>;
  cache?: boolean;
  platform?: string;
}

/**
 * Service configuration for docker-compose
 */
export interface ServiceConfig {
  image?: string;
  build?: BuildConfig;
  ports?: string[];
  environment?: Record<string, string>;
  volumes?: string[];
  depends_on?: string[];
  healthcheck?: HealthCheckConfig;
  restart?: RestartPolicy;
  networks?: string[];
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  test: string | string[];
  interval: string;
  timeout: string;
  retries: number;
  start_period?: string;
}

/**
 * Volume mount configuration
 */
export interface VolumeMount {
  source: string;
  target: string;
  type?: 'bind' | 'volume' | 'tmpfs';
  readonly?: boolean;
}

/**
 * Restart policy types
 */
export type RestartPolicy = 'no' | 'always' | 'unless-stopped' | 'on-failure';

/**
 * Registry configuration
 */
export interface RegistryConfig {
  url: string;
  username?: string;
  password?: string;
  namespace?: string;
}

/**
 * Image information
 */
export interface ImageInfo {
  name: string;
  tag: string;
  size: number;
  layers: number;
  vulnerabilities?: VulnerabilityReport[];
}

/**
 * Development configuration
 */
export interface DevConfig {
  volumes: string[];
  environment: Record<string, string>;
  ports: string[];
  command?: string;
}

/**
 * Network configuration
 */
export interface NetworkConfig {
  driver: string;
  ipam?: {
    config: Array<{ subnet: string }>;
  };
}

/**
 * Volume configuration
 */
export interface VolumeConfig {
  driver: string;
  driver_opts?: Record<string, string>;
}

/**
 * Vulnerability report
 */
export interface VulnerabilityReport {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  fixedIn?: string;
}

/**
 * Docker generator context
 */
export interface DockerGeneratorContext extends GeneratorContext {
  dockerConfig?: DockerConfigInterface;
}
