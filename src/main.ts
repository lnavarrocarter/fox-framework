import { FoxFactoryContext } from "../tsfox/core/interfaces/factory.interface";
import { RequestMethod } from "../tsfox/core/enums/methods.enums";
import { ServerTypeCtx } from "../tsfox/core/enums/server.enums";
import FoxFactory from "../tsfox/core/fox.factory";



const CnxServer : FoxFactoryContext = {
    port: 3000,
    env: 'development',
    requests: [
        {
            method: RequestMethod.GET,
            path: '/test',
            callback: (req: any, res: any) => {
                console.log("Enter to api /test")
                res.json({ message: 'Hello World!' })
            }
        }
    ],
    views: [
        {
            path: '/html',
            type: 'html',
            callback: (req: any, res: any) => {
                console.log("Enter to view /")
                res.send('<h1>Hello World!</h1>')
            }
        },
        {
            path: '/file',
            type: 'file',
            callback: (req: any, res: any) => {
                console.log("Enter to view /")
                res.render('index.html', { title: 'Hey', message: 'Hello there!' })
            }
        },
        {
            path: '/hbs',
            type: 'hbs',
            callback: (req: any, res: any) => {
                console.log("Enter to view /")
                res.render('index.hbs', { title: 'Hey', message: 'Hello there!' })
            }
        },
        {
            path: '/jsx',
            type: 'jsx',
            callback: (req: any, res: any) => {
                console.log("Enter to view /")
                res.render('index.jsx', { title: 'Hey', message: 'Hello there!' })
            }
        }
    ],
    middlewares: [],
    providers: [],
    logger: undefined,
    serverType: ServerTypeCtx.HTML
}
const app = FoxFactory.createInstance(CnxServer);
app.start();
console.log({app}, 'app');