import { RequestMethod } from "../enums/methods.enums";
import { RequestMethodsContext } from "../enums/request.enums";
import { ServerTypeCtx } from "../enums/server.enums";


export interface FoxFactory {
    createInstance(): void;
    getInstance(): void;
    destroyInstance(): void;
    request(request: Array<RequestMethodsContext>): void;
}

export interface FoxFactoryContext {
    port: number;
    env: string;
    logger: any;
    providers: Array<any>;
    views: Array<any>;
    serverType: ServerTypeCtx;
    requests : Array<RequestMethodsContext>;
    middlewares: Array<any>;
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
    set(path: string, callback: any): void;
    html: (type: string, path: string, callback: any) => void;
};


