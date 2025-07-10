import { views } from '../views';

describe('Server Views', () => {
    it('should export views array', () => {
        expect(views).toBeDefined();
        expect(Array.isArray(views)).toBe(true);
    });

    it('should contain multiple views', () => {
        expect(views.length).toBe(4);
    });

    it('should have html view configuration', () => {
        const htmlView = views.find(view => view.path === '/html');
        expect(htmlView).toBeDefined();
        expect(htmlView?.type).toBe('code');
        expect(typeof htmlView?.callback).toBe('function');
    });

    it('should have file view configuration', () => {
        const fileView = views.find(view => view.path === '/file');
        expect(fileView).toBeDefined();
        expect(fileView?.type).toBe('html');
        expect(typeof fileView?.callback).toBe('function');
    });

    it('should have hbs view configuration', () => {
        const hbsView = views.find(view => view.path === '/hbs');
        expect(hbsView).toBeDefined();
        expect(hbsView?.type).toBe('hbs');
        expect(typeof hbsView?.callback).toBe('function');
    });

    it('should have fox view configuration', () => {
        const foxView = views.find(view => view.path === '/fox');
        expect(foxView).toBeDefined();
        expect(foxView?.type).toBe('fox');
        expect(typeof foxView?.callback).toBe('function');
    });

    describe('View Callbacks', () => {
        let consoleSpy: jest.SpyInstance;

        beforeEach(() => {
            consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        });

        afterEach(() => {
            consoleSpy.mockRestore();
        });

        it('should execute html view callback', () => {
            const htmlView = views.find(view => view.path === '/html');
            const mockReq = {};
            const mockRes = {
                send: jest.fn()
            };

            htmlView?.callback(mockReq, mockRes);

            expect(consoleSpy).toHaveBeenCalledWith("Enter to view /");
            expect(mockRes.send).toHaveBeenCalledWith('<h1>Hello World!</h1>');
        });

        it('should execute file view callback', () => {
            const fileView = views.find(view => view.path === '/file');
            const mockReq = {};
            const mockRes = {
                render: jest.fn()
            };

            fileView?.callback(mockReq, mockRes);

            expect(consoleSpy).toHaveBeenCalledWith("Enter to view /file");
            expect(mockRes.render).toHaveBeenCalledWith('index.html', { title: 'Hey', message: 'Hello test example de variables!' });
        });

        it('should execute hbs view callback', () => {
            const hbsView = views.find(view => view.path === '/hbs');
            const mockReq = {};
            const mockRes = {
                render: jest.fn()
            };

            hbsView?.callback(mockReq, mockRes);

            expect(consoleSpy).toHaveBeenCalledWith("Enter to view /hbs");
            expect(mockRes.render).toHaveBeenCalledWith('index.hbs', { title: 'Hey', message: 'Hello there this hbs!' });
        });

        it('should execute fox view callback', () => {
            const foxView = views.find(view => view.path === '/fox');
            const mockReq = {};
            const mockRes = {
                render: jest.fn()
            };

            foxView?.callback(mockReq, mockRes);

            expect(consoleSpy).toHaveBeenCalledWith("Enter to view /fox");
            expect(mockRes.render).toHaveBeenCalledWith('index.fox', { title: 'Hey', message: 'Hello there this fox!' });
        });
    });

    it('should have valid view structure for all views', () => {
        views.forEach(view => {
            expect(view.path).toBeDefined();
            expect(typeof view.path).toBe('string');
            expect(view.type).toBeDefined();
            expect(typeof view.type).toBe('string');
            expect(view.callback).toBeDefined();
            expect(typeof view.callback).toBe('function');
            expect(view.callback.length).toBe(2); // Should accept req and res parameters
        });
    });
});
