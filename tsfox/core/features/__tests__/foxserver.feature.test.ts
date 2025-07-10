import { FoxServer } from '../foxserver.feature';
import { ServerConfig } from '../../types';
import express from 'express';

// Mock express
jest.mock('express');
const mockExpress = express as jest.MockedFunction<typeof express>;

describe('FoxServer', () => {
    let mockApp: any;
    let serverConfig: ServerConfig;

    beforeEach(() => {
        // Create mock app with all necessary methods
        mockApp = {
            set: jest.fn(),
            use: jest.fn(),
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
            patch: jest.fn(),
            all: jest.fn(),
            listen: jest.fn(),
            engine: jest.fn()
        };

        // Mock express to return our mock app
        mockExpress.mockReturnValue(mockApp);
        mockExpress.json = jest.fn().mockReturnValue('mock-json-middleware');
        mockExpress.urlencoded = jest.fn().mockReturnValue('mock-urlencoded-middleware');
        // Simple mock for static without the complex mime property
        (mockExpress as any).static = jest.fn().mockReturnValue('mock-static-middleware');

        serverConfig = {
            port: 3000,
            env: 'test',
            jsonSpaces: 4,
            staticFolder: 'public'
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create FoxServer instance with provided config', () => {
            const server = new FoxServer(serverConfig);
            
            expect(mockExpress).toHaveBeenCalled();
            expect(mockApp.set).toHaveBeenCalledWith('port', 3000);
            expect(server).toBeInstanceOf(FoxServer);
        });

        it('should handle different port and env values', () => {
            const customConfig: ServerConfig = { 
                port: 8080, 
                env: 'production',
                jsonSpaces: 2,
                staticFolder: 'dist'
            };
            const server = new FoxServer(customConfig);
            
            expect(mockApp.set).toHaveBeenCalledWith('port', 8080);
            expect(server).toBeInstanceOf(FoxServer);
        });
    });

    describe('create', () => {
        it('should configure express app with middleware and settings', () => {
            const server = new FoxServer(serverConfig);
            server.create();

            // Check all configurations are called
            expect(mockApp.set).toHaveBeenCalledWith('port', 3000);
            expect(mockApp.set).toHaveBeenCalledWith('env', 'test');
            expect(mockApp.set).toHaveBeenCalledWith('json spaces', 4);
            
            // Check middleware setup
            expect(mockApp.use).toHaveBeenCalledWith('mock-json-middleware');
            expect(mockApp.use).toHaveBeenCalledWith('mock-urlencoded-middleware');
            expect(mockApp.use).toHaveBeenCalledWith('mock-static-middleware');
            
            // Check engines setup
            expect(mockApp.engine).toHaveBeenCalledWith('fox', expect.any(Function));
            expect(mockApp.engine).toHaveBeenCalledWith('html', expect.any(Function));
        });
    });

    describe('HTTP methods', () => {
        let server: FoxServer;
        const mockCallback = jest.fn();
        const testPath = '/test';

        beforeEach(() => {
            server = new FoxServer(serverConfig);
        });

        it('should call app.get for GET routes', () => {
            server.get(testPath, mockCallback);
            expect(mockApp.get).toHaveBeenCalledWith(testPath, mockCallback);
        });

        it('should call app.post for POST routes', () => {
            server.post(testPath, mockCallback);
            expect(mockApp.post).toHaveBeenCalledWith(testPath, mockCallback);
        });

        it('should call app.put for PUT routes', () => {
            server.put(testPath, mockCallback);
            expect(mockApp.put).toHaveBeenCalledWith(testPath, mockCallback);
        });

        it('should call app.delete for DELETE routes', () => {
            server.delete(testPath, mockCallback);
            expect(mockApp.delete).toHaveBeenCalledWith(testPath, mockCallback);
        });

        it('should call app.patch for PATCH routes', () => {
            server.patch(testPath, mockCallback);
            expect(mockApp.patch).toHaveBeenCalledWith(testPath, mockCallback);
        });

        it('should call app.all for ALL routes', () => {
            server.all(testPath, mockCallback);
            expect(mockApp.all).toHaveBeenCalledWith(testPath, mockCallback);
        });
    });

    describe('settings and configuration', () => {
        let server: FoxServer;

        beforeEach(() => {
            server = new FoxServer(serverConfig);
        });

        it('should set app settings via set method', () => {
            server.set('custom-setting', 'custom-value');
            expect(mockApp.set).toHaveBeenCalledWith('custom-setting', 'custom-value');
        });

        it('should configure views and render setup', () => {
            const mockCallback = jest.fn();
            server.render('pug', '/template', mockCallback);
            
            expect(mockApp.set).toHaveBeenCalledWith('views', expect.any(String));
            expect(mockApp.set).toHaveBeenCalledWith('view engine', 'pug');
            expect(mockApp.get).toHaveBeenCalledWith('/template', mockCallback);
        });

        it('should add middleware via use method', () => {
            const customMiddleware = jest.fn();
            server.use(customMiddleware);
            expect(mockApp.use).toHaveBeenCalledWith(customMiddleware);
        });
    });

    describe('server lifecycle', () => {
        let server: FoxServer;
        let consoleSpy: jest.SpyInstance;

        beforeEach(() => {
            server = new FoxServer(serverConfig);
            consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        });

        afterEach(() => {
            consoleSpy.mockRestore();
        });

        it('should listen on configured port', () => {
            const mockCallback = jest.fn();
            mockApp.listen.mockImplementation((port: number, callback: Function) => {
                callback();
                return mockApp;
            });

            server.listen();
            
            expect(mockApp.listen).toHaveBeenCalledWith(3000, expect.any(Function));
            expect(consoleSpy).toHaveBeenCalledWith('Server listening on port 3000');
        });

        it('should listen on custom port when provided', () => {
            const customPort = 8080;
            mockApp.listen.mockImplementation((port: number, callback: Function) => {
                callback();
                return mockApp;
            });

            server.listen(customPort);
            
            expect(mockApp.listen).toHaveBeenCalledWith(customPort, expect.any(Function));
            expect(consoleSpy).toHaveBeenCalledWith('Server listening on port 8080');
        });

        it('should use configured port when no custom port provided', () => {
            mockApp.listen.mockImplementation((port: number, callback: Function) => {
                callback();
                return mockApp;
            });

            server.listen(undefined);
            
            expect(mockApp.listen).toHaveBeenCalledWith(3000, expect.any(Function));
        });

        it('should start server using default port', () => {
            mockApp.listen.mockImplementation((port: number, callback: Function) => {
                callback();
                return mockApp;
            });

            server.start();
            
            expect(mockApp.listen).toHaveBeenCalledWith(3000, expect.any(Function));
            expect(consoleSpy).toHaveBeenCalledWith('Server listening on port 3000');
        });

        it('should destroy server and log message', () => {
            server.destroy();
            expect(consoleSpy).toHaveBeenCalledWith('Destroying server...');
        });
    });
});
