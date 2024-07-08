import { FoxFactory } from './core/fox.factory';
import { ServerConfig, Route, Middleware, HttpError } from './core/types';
import { Router } from './core/router.factory';



const startServer = (config: ServerConfig): void => {
    const app = FoxFactory.createInstance(config)
    app.start();
};

export { startServer, Router, HttpError, Middleware, Route, ServerConfig };
