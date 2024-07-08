export const views = [
    {
        path: '/html',
        type: 'code',
        callback: (req: any, res: any) => {
            console.log("Enter to view /");
            res.send('<h1>Hello World!</h1>');
        }
    },
    {
        path: '/file',
        type: 'html',
        callback: (req: any, res: any) => {
            console.log("Enter to view /file");
            res.render('index.html', { title: 'Hey', message: 'Hello test example de variables!' });
        }
    },
    {
        path: '/hbs',
        type: 'hbs',
        callback: (req: any, res: any) => {
            console.log("Enter to view /hbs");
            res.render('index.hbs', { title: 'Hey', message: 'Hello there this hbs!' });
        }
    },
    {
        path: '/fox',
        type: 'fox',
        callback: (req: any, res: any) => {
            console.log("Enter to view /fox");
            res.render('index.fox', { title: 'Hey', message: 'Hello there this fox!' });
        }
    }
];
