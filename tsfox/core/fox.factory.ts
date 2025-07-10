
import { FoxServerInterface } from './interfaces/factory.interface';
import { RequestMethod } from './enums/methods.enums';
import { FoxServer } from './features/foxserver.feature';
import { ConfigServer } from './enums/server.enums';
import { ServerConfig } from './types';

const InitialRequest = {
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

export class FoxFactory {

    private static instance: FoxServerInterface;
    private static requests: Array<{ method: RequestMethod, path: string, callback: any }>;

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
            console.info(`viewsManager: ${path} - ${callback}`)
            //validate if file is html, hbs or jxs
            FoxFactory.instance.render(type, path, callback);
        })
    }


    private static requestsManager(request: Array<{ method: RequestMethod, path: string, callback: any }>): void {
        request.forEach((item) => {
            console.info(`requestsManager: ${item.method} - ${item.path} - ${item.callback}`)
            const { method, path, callback } = item;
            
            // Add /api prefix only if it doesn't already exist
            const prefixPath = path.startsWith('/api') ? path : `${ConfigServer.API}${path}`;
            
            FoxFactory.instance[method](prefixPath, callback);
        })
    }

    public start() {
        FoxFactory.instance.start();
    }

}


export default FoxFactory;