import { NextFunction } from "express";
import { RequestMethod } from "./enums/methods.enums";
import { RequestMethodsContext } from "./enums/request.enums";
import { ServerTypeCtx } from "./enums/server.enums";

export interface FoxFactory {
    createInstance(): void;
    getInstance(): void;
    destroyInstance(): void;
    request(requests: Array<RequestMethodsContext>): void;
}

export interface FoxFactoryContext {
    port: number;
    env: string;
    logger?: any;
    providers?: Array<any>;
    views?: Array<any>;
    serverType?: ServerTypeCtx;
    requests?: Array<RequestMethodsContext>;
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


export type RequestCallback = (req: Request, res: Response, next: NextFunction) => void;

// Tipo base para los callbacks de vistas
export type ViewCallback = (req: Request, res: Response) => void;

// Tipo para la configuración del servidor
export interface ServerConfig extends FoxFactoryContext {
    port: number;
    env: string;
    jsonSpaces: number;
    staticFolder: string;
    middlewares?: Middleware[];
}

export interface Route {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    handler: (req: Request, res: Response) => void;
}

export interface Middleware {
    (req: Request, res: Response, next: () => void): void;
}

export class HttpError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'HttpError';
    }
}
