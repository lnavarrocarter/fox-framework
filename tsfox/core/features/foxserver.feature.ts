import express from 'express';
import { IServer } from '../interfaces/server.interface';
import { ServerOptions, FoxServerInterface } from '../interfaces/factory.interface';
import { ConfigServer } from '../enums/server.enums';
import { engineFox, engineHtml } from './engine.feature';


export class FoxServer implements IServer, FoxServerInterface {
    private readonly app: express.Application;
    private readonly port: number;
    private readonly env: string;

    constructor(optionsServer: ServerOptions) {
        this.app = express();
        this.port = optionsServer.port;
        this.env = optionsServer.env;
        this.set('port', this.port);
    }

    public create(): void {
        this.set('port', this.port);
        this.set('env', this.env);
        this.set('json spaces', 4);
        this.use(express.json());
        this.use(express.urlencoded({ extended: false }));
        this.use(express.static('public'));
        this.app.engine('fox', engineFox)
        this.app.engine('html', engineHtml)
        
    }

    public get(path: string, callback: any): any {
        this.app.get(path, callback);
    }

    public post(path: string, callback: any): any {
        this.app.post(path, callback);
    }

    public put(path: string, callback: any): any {
        this.app.put(path, callback);
    }

    public delete(path: string, callback: any): any {
        this.app.delete(path, callback);
    }

    public patch(path: string, callback: any): any {
        this.app.patch(path, callback);
    }

    public all(path: string, callback: any): any {
        this.app.all(path, callback);
    }

    public set(setting: string, value: any): any {
        this.app.set(setting, value);
    }

    public render(type: string, path: string, callback: any): any {
        this.app.set('views', ConfigServer.VIEWS);
        this.app.set('view engine', type);
        this.app.get(path, callback);
    }

    public use(callback: any): void {
        this.app.use(callback);
    }

    public start(): void {
        this.app.listen(this.port, () => {
            console.log(`Server listening on port ${this.port}`);
        });
    }

    public destroy(): void {
        console.log('Destroying server...');
    }
}
