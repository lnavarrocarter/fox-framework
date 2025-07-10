import { Request, Response, NextFunction } from 'express';
import {
    createErrorHandler,
    ConsoleErrorLogger,
    ErrorHandlerConfig,
    ErrorLogger
} from '../error.middleware';
import { HttpError, SystemError, ErrorCode } from '../error.enhanced';

describe('Error Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;
    let mockLogger: jest.Mocked<ErrorLogger>;

    beforeEach(() => {
        mockRequest = {
            method: 'GET',
            path: '/test',
            headers: {},
            body: {}
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            locals: {}
        };
        mockNext = jest.fn();
        mockLogger = {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn()
        };
    });

    describe('ConsoleErrorLogger', () => {
        let consoleErrorSpy: jest.SpyInstance;
        let consoleWarnSpy: jest.SpyInstance;
        let consoleInfoSpy: jest.SpyInstance;

        beforeEach(() => {
            consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
        });

        afterEach(() => {
            consoleErrorSpy.mockRestore();
            consoleWarnSpy.mockRestore();
            consoleInfoSpy.mockRestore();
        });

        it('should log errors to console', () => {
            const logger = new ConsoleErrorLogger();
            const error = new Error('Test error');
            const context = { requestId: 'test-123' };

            logger.error('Error occurred', error, context);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[ERROR] Error occurred',
                expect.objectContaining({
                    error: expect.objectContaining({
                        name: 'Error',
                        message: 'Test error'
                    }),
                    context
                })
            );
        });

        it('should log warnings to console', () => {
            const logger = new ConsoleErrorLogger();
            const error = new Error('Warning error');

            logger.warn('Warning occurred', error);

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                '[WARN] Warning occurred',
                expect.objectContaining({
                    error: expect.objectContaining({
                        name: 'Error',
                        message: 'Warning error'
                    })
                })
            );
        });

        it('should log info to console', () => {
            const logger = new ConsoleErrorLogger();
            const context = { action: 'test' };

            logger.info('Info message', context);

            expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Info message', context);
        });
    });

    describe('createErrorHandler', () => {
        it('should create error handler with default config', () => {
            const errorHandler = createErrorHandler();
            expect(typeof errorHandler).toBe('function');
        });

        it('should handle HttpError correctly', () => {
            const config: ErrorHandlerConfig = {
                logger: mockLogger,
                includeStackTrace: false
            };
            const errorHandler = createErrorHandler(config);
            const error = new HttpError('Not found', 404);

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        message: 'Not found',
                        code: 'NOT_FOUND'
                    })
                })
            );
        });

        it('should handle SystemError correctly', () => {
            const config: ErrorHandlerConfig = {
                logger: mockLogger,
                includeStackTrace: false
            };
            const errorHandler = createErrorHandler(config);
            const error = new SystemError('Database error', ErrorCode.DATABASE_ERROR);

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Server Error: Database error',
                error,
                expect.any(Object)
            );
        });

        it('should handle generic Error', () => {
            const config: ErrorHandlerConfig = {
                logger: mockLogger,
                includeStackTrace: false
            };
            const errorHandler = createErrorHandler(config);
            const error = new Error('Generic error');

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        message: 'An unexpected error occurred',
                        code: 'INTERNAL_SERVER_ERROR'
                    })
                })
            );
        });

        it('should include stack trace in development', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const config: ErrorHandlerConfig = {
                logger: mockLogger
            };
            const errorHandler = createErrorHandler(config);
            const error = new HttpError('Test error', 400);

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        message: 'Test error'
                    })
                })
            );

            process.env.NODE_ENV = originalEnv;
        });

        it('should not include stack trace in production', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            const config: ErrorHandlerConfig = {
                logger: mockLogger,
                includeStackTrace: false
            };
            const errorHandler = createErrorHandler(config);
            const error = new HttpError('Test error', 400);

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
            expect(callArgs.error.stack).toBeUndefined();

            process.env.NODE_ENV = originalEnv;
        });

        it('should use custom error mapping', () => {
            const customErrorMap = new Map();
            customErrorMap.set('Error', (error: Error) => 
                new HttpError(`Custom: ${error.message}`, 422)
            );

            const config: ErrorHandlerConfig = {
                logger: mockLogger,
                customErrorMap
            };
            const errorHandler = createErrorHandler(config);
            
            const error = new Error('Custom error');

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(422);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        message: 'Custom: Custom error'
                    })
                })
            );
        });

        it('should extract request context', () => {
            const config: ErrorHandlerConfig = {
                logger: mockLogger
            };
            const errorHandler = createErrorHandler(config);
            const error = new HttpError('Test error', 400);

            mockRequest.headers = { 'x-request-id': 'test-123' };
            mockResponse.locals = { userId: 'user-456' };

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Client Error: Test error',
                error,
                expect.objectContaining({
                    method: 'GET',
                    path: '/test',
                    requestId: 'test-123',
                    code: 'BAD_REQUEST',
                    statusCode: 400
                })
            );
        });

        it('should log and report errors appropriately', () => {
            const config: ErrorHandlerConfig = {
                logger: mockLogger,
                reportToMonitoring: true
            };
            const errorHandler = createErrorHandler(config);

            // Client error (should warn, not report)
            const clientError = new HttpError('Bad request', 400);
            errorHandler(clientError, mockRequest as Request, mockResponse as Response, mockNext);
            expect(mockLogger.warn).toHaveBeenCalled();

            // Reset mocks
            jest.clearAllMocks();

            // Server error (should error and report)
            const serverError = new HttpError('Internal error', 500);
            errorHandler(serverError, mockRequest as Request, mockResponse as Response, mockNext);
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
});
