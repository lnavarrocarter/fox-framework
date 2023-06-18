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
            type: 'code',
            callback: (req: any, res: any) => {
                console.log("Enter to view /")
                res.send('<h1>Hello World!</h1>')
            }
        },
        {
            path: '/file',
            type: 'html',
            callback: (req: any, res: any) => {
                console.log("Enter to view /file")
                res.render('index.html', { title: 'Hey', message: 'Hello test example de variables!' })
            }
        },
        {
            path: '/hbs',
            type: 'hbs',
            callback: (req: any, res: any) => {
                console.log("Enter to view /hbs")
                res.render('index.hbs', { title: 'Hey', message: 'Hello there this hbs!' })
            }
        },
        {
            path: '/fox',
            type: 'fox',
            callback: (req: any, res: any) => {
                console.log("Enter to view /fox")
                res.render('index.fox', { title: 'Hey', message: 'Hello there this fox!' })
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