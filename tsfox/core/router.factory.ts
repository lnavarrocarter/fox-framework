import { Route } from "./types";
import { Express } from "express"; 

export class Router {
    private routes: Route[] = [];

    public register(route: Route): void {
        this.routes.push(route);
    }

    public applyRoutes(app: Express): void {
        this.routes.forEach(route => {
            (app as any)[route.method.toLowerCase()](route.path, route.handler);
        });
    }
}
