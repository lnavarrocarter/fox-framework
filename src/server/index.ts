

import { views } from "./views";
import { routes } from "./routes";
import { config } from "./config";
import { startServer, Route } from "./../../tsfox/index";


const app = startServer(config);

console.log({app}, 'app');