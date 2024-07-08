import { routes } from './routes';
import { ServerConfig } from "../../tsfox";
import { views } from './views';


export const config: ServerConfig = {
    port: 3000,
    env: 'development',
    jsonSpaces: 0,
    staticFolder: "public",
    requests: routes,
    views: views
}