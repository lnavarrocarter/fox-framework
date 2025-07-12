import { NextFunction, Request, Response } from "express";
import { RequestMethod } from "./enums/methods.enums";
import { RequestMethodsContext } from "./enums/request.enums";
import { ServerTypeCtx } from "./enums/server.enums";
import { ILogger } from "./logging/interfaces";
// Security imports
import { 
  SecurityMiddleware,
  CorsOptions,
  RateLimitOptions,
  JwtOptions,
  SessionOptions,
  User,
  RbacOptions,
  CsrfOptions,
  SecurityHeadersOptions,
  RequestValidationOptions
} from "./security/interfaces";

export interface FoxFactory {
    createInstance(): void;
    getInstance(): void;
    destroyInstance(): void;
    request(requests: Array<RequestMethodsContext>): void;
}

export interface FoxFactoryContext {
    port: number;
    env: string;
    logger?: ILogger;
    providers?: Array<any>;
    views?: Array<any>;
    serverType?: ServerTypeCtx;
    requests?: Array<RequestMethodsContext>;
    // Security configuration
    security?: {
        cors?: CorsOptions;
        rateLimit?: RateLimitOptions;
        csrf?: CsrfOptions;
        jwt?: JwtOptions;
        session?: SessionOptions;
        rbac?: RbacOptions;
        headers?: SecurityHeadersOptions;
        validation?: RequestValidationOptions;
    };
}

export interface ServerOptions {
    port: number;
    env: string;
}

export type FoxServerInterface = {
    [index in RequestMethod]: any;
} & {
    create: () => void;
    start: () => void;
    destroy: () => void;
    use: (callback: any) => void;
    get: (path: string, callback: any) => void;
    post: (path: string, callback: any) => void;
    put: (path: string, callback: any) => void;
    delete: (path: string, callback: any) => void;
    set: (path: string, callback: any) => void;
    render: (type: string, path: string, callback: any) => void;
};

// Tipo base para los callbacks de rutas
export type RequestCallback = (req: Request, res: Response, next: NextFunction) => void;

// Tipo base para los callbacks de vistas
export type ViewCallback = (req: Request, res: Response) => void;

// Tipo para middleware normal
export type Middleware = (req: Request, res: Response, next: NextFunction) => void;

// Tipo para error handlers
export type ErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => void;

// Tipo para la configuración del servidor
export interface ServerConfig extends FoxFactoryContext {
    port: number;
    env: string;
    jsonSpaces: number;
    staticFolder: string;
    middlewares?: Middleware[];
    errorHandler?: ErrorHandler;
}

export interface Route {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    handler: (req: Request, res: Response) => void;
}

// Cache system types
export type { 
    ICache,
    ICacheProvider,
    CacheEntry,
    CacheMetrics,
    ProviderInfo,
    CacheConfig,
    RedisConfig,
    FileConfig,
    MemoryConfig,
    CacheOptions,
    CacheProvider,
    EvictionPolicy,
    CacheKeyGenerator,
    CacheCondition
} from './cache/interfaces';

// Microservices types
export type { 
  MicroservicesConfig,
  ServiceInfo,
  HealthStatus,
  LoadBalancingAlgorithm,
  CircuitBreakerConfig,
  ServiceRegistryInterface,
  LoadBalancerInterface,
  CircuitBreakerInterface,
  APIGatewayInterface,
  ServiceMeshInterface
} from './features/microservices/interfaces';

export class HttpError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'HttpError';
    }
}
