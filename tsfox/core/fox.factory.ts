
import { FoxServerInterface } from './interfaces/factory.interface';
import { RequestMethod } from './enums/methods.enums';
import { RequestMethodsContext } from './enums/request.enums';
import { FoxServer } from './features/foxserver.feature';
import { ConfigServer } from './enums/server.enums';
import { ServerConfig } from './types';
import { LoggerFactory } from './logging/logger.factory';
import { LogLevel } from './logging/interfaces';

const InitialRequest: RequestMethodsContext = {
    method: RequestMethod.GET,
    path: '/',
    callback: (req: any, res: any) => {
         return res.json({ message: 'Hello World!' })
    }
}

const InitialView = {
    path: '/',
    files: 'index.html',
    callback: (req: any, res: any) => {
        return res.send('<h1>Hello World!</h1>')
    }
}

/** Lightweight return type of FoxFactory.create() */
export interface FoxApp {
    listen(port?: number, callback?: () => void): void;
}

export class FoxFactory {

    private static instance: FoxServerInterface;
    private static requests: Array<{ method: RequestMethod, path: string, callback: any }>;
    private static logger = LoggerFactory.create({ level: LogLevel.DEBUG });

    /**
     * Create a Fox server instance and return a FoxApp with a .listen() method.
     * This is the recommended API for new projects:
     *
     * @example
     * const app = FoxFactory.create({ port: 3000, env: 'development', ... });
     * app.listen(3000, () => console.log('Running!'));
     */
    public static create(context: ServerConfig): FoxApp {
        FoxFactory.createInstance(context);
        return {
            listen(port?: number, callback?: () => void) {
                FoxFactory.listen();
                callback?.();
            }
        };
    }

    /**
     * Create a Fox server instance (lower-level API).
     * Use FoxFactory.listen() to start the server after calling this.
     */
    public static createInstance(context: ServerConfig) {
        if (!FoxFactory.instance) {
            const server = new FoxServer(context);
            FoxFactory.instance = server; 
            FoxFactory.instance.create();
        }
        this.requestsManager(context?.requests || [InitialRequest]);
        this.viewsManager(context?.views || [InitialView]);
        
        return this.getInstance();
    }

    public static getInstance() {
        if (!FoxFactory.instance) {
            throw new Error('Factory instance not created yet. Call createInstance() first.');
        }
        return FoxFactory.instance;
    }

    public static listen(){
        FoxFactory.instance.start();
    }

    private static destroyInstance() {
        FoxFactory.instance.destroy();
    }
    
    // Public method for testing purposes
    public static resetInstance() {
        FoxFactory.instance = null as any;
    }
    
    private static viewsManager(views: Array<{ type: string, path: string, callback: any }>): void {
        views.forEach((item) => {
            const { path, type, callback } = item;
            FoxFactory.logger.debug(`viewsManager: ${path}`, { handler: callback?.name || 'anonymous' });
            //validate if file is html, hbs or jxs
            FoxFactory.instance.render(type, path, callback);
        })
    }

    private static requestsManager(request: Array<RequestMethodsContext>): void {
        request.forEach((item) => {
            const { method, path } = item;
            // Support both `callback` (original API) and `handler` (alias)
            const fn = item.callback ?? item.handler;
            FoxFactory.logger.debug(`requestsManager: ${method} ${path}`, { handler: fn?.name || 'anonymous' });
            
            // Add /api prefix only if it doesn't already exist
            const prefixPath = path.startsWith('/api') ? path : `${ConfigServer.API}${path}`;
            
            FoxFactory.instance[method](prefixPath, fn);
        })
    }

    public start() {
        FoxFactory.instance.start();
    }

}


export default FoxFactory;
