import { RequestMethod } from "../../tsfox/core/enums/methods.enums";

export const routes = [
    {
        method: RequestMethod.GET,
        path: '/test',
        callback: (req: any, res: any) => {
            console.log("Enter to api /test");
            res.json({ message: 'Hello World!' });
        }
    }
];
