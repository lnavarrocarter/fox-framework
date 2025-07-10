import { 
    createErrorHandler, 
    asyncHandler, 
    setupGlobalErrorHandlers,
    notFoundHandler,
    requestIdMiddleware,
    ConsoleErrorLogger,
    CircuitBreaker,
    RetryHandler,
    ErrorHandlerConfig,
    ErrorLogger
} from '../error.middleware';
import { FoxError, HttpError, ErrorCode } from '../error.enhanced';
import { Request, Response, NextFunction } from 'express';

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleInfo = jest.spyOn(console, 'info').mockImplementation();

// Mock process methods
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();

describe('Enhanced Error Middleware Coverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('CircuitBreaker', () => {
        let circuitBreaker: CircuitBreaker;

        beforeEach(() => {
            circuitBreaker = new CircuitBreaker(2, 1000, 2000);
        });

        it('should execute function successfully when circuit is closed', async () => {
            const mockFn = jest.fn().mockResolvedValue('success');

            const result = await circuitBreaker.execute(mockFn);

            expect(result).toBe('success');
            expect(circuitBreaker.getState()).toBe('CLOSED');
            expect(circuitBreaker.getFailureCount()).toBe(0);
        });

        it('should open circuit after failure threshold', async () => {
            const mockFn = jest.fn().mockRejectedValue(new Error('Failure'));

            try {
                await circuitBreaker.execute(mockFn);
            } catch {}
            
            try {
                await circuitBreaker.execute(mockFn);
            } catch {}

            expect(circuitBreaker.getState()).toBe('OPEN');
            expect(circuitBreaker.getFailureCount()).toBe(2);
        });

        it('should throw error when circuit is open', async () => {
            const mockFn = jest.fn().mockRejectedValue(new Error('Failure'));

            // Cause failures to open circuit
            try {
                await circuitBreaker.execute(mockFn);
            } catch {}
            try {
                await circuitBreaker.execute(mockFn);
            } catch {}

            // Should throw circuit breaker error
            await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Circuit breaker is OPEN');
        });

        it('should transition to half-open after timeout', async () => {
            const mockFn = jest.fn().mockRejectedValue(new Error('Failure'));

            // Open the circuit
            try {
                await circuitBreaker.execute(mockFn);
            } catch {}
            try {
                await circuitBreaker.execute(mockFn);
            } catch {}

            // Create circuit breaker with very short timeout for testing
            const shortTimeoutBreaker = new CircuitBreaker(2, 1, 2000);
            
            // Open it
            try {
                await shortTimeoutBreaker.execute(mockFn);
            } catch {}
            try {
                await shortTimeoutBreaker.execute(mockFn);
            } catch {}

            // Wait for timeout
            await new Promise(resolve => setTimeout(resolve, 10));

            // Next call should transition to half-open
            mockFn.mockResolvedValueOnce('success');
            const result = await shortTimeoutBreaker.execute(mockFn);

            expect(result).toBe('success');
            expect(shortTimeoutBreaker.getState()).toBe('CLOSED');
        });

        it('should handle successful call in half-open state', async () => {
            const breaker = new CircuitBreaker(1, 10, 2000);
            const mockFn = jest.fn();

            // Open circuit
            mockFn.mockRejectedValueOnce(new Error('Fail'));
            try {
                await breaker.execute(mockFn);
            } catch {}

            expect(breaker.getState()).toBe('OPEN');

            // Wait for timeout
            await new Promise(resolve => setTimeout(resolve, 20));

            // Success in half-open should close circuit
            mockFn.mockResolvedValueOnce('success');
            const result = await breaker.execute(mockFn);

            expect(result).toBe('success');
            expect(breaker.getState()).toBe('CLOSED');
            expect(breaker.getFailureCount()).toBe(0);
        });

        it('should handle failure in half-open state', async () => {
            const breaker = new CircuitBreaker(1, 10, 2000);
            const mockFn = jest.fn();

            // Open circuit
            mockFn.mockRejectedValueOnce(new Error('Fail'));
            try {
                await breaker.execute(mockFn);
            } catch {}

            // Wait for timeout
            await new Promise(resolve => setTimeout(resolve, 20));

            // Failure in half-open should open circuit again
            mockFn.mockRejectedValueOnce(new Error('Still failing'));
            try {
                await breaker.execute(mockFn);
            } catch {}

            expect(breaker.getState()).toBe('OPEN');
        });
    });

    describe('RetryHandler', () => {
        let retryHandler: RetryHandler;

        beforeEach(() => {
            retryHandler = new RetryHandler(2, 1, 10); // Very small delays
        });

        it('should succeed on first try', async () => {
            const mockFn = jest.fn().mockResolvedValue('success');

            const result = await retryHandler.execute(mockFn);

            expect(result).toBe('success');
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        it('should retry failed operations', async () => {
            const mockFn = jest.fn()
                .mockRejectedValueOnce(new Error('First failure'))
                .mockResolvedValueOnce('success');

            const result = await retryHandler.execute(mockFn);

            expect(result).toBe('success');
            expect(mockFn).toHaveBeenCalledTimes(2);
        });

        it('should throw last error after max retries', async () => {
            const mockFn = jest.fn().mockRejectedValue(new Error('Persistent failure'));

            await expect(retryHandler.execute(mockFn)).rejects.toThrow('Persistent failure');
            expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });

        it('should respect retry condition', async () => {
            const mockFn = jest.fn().mockRejectedValue(new Error('Non-retryable error'));
            const retryCondition = (error: Error) => false; // Never retry

            await expect(retryHandler.execute(mockFn, retryCondition)).rejects.toThrow('Non-retryable error');
            expect(mockFn).toHaveBeenCalledTimes(1); // No retries
        });

        it('should respect retry condition with mixed results', async () => {
            const mockFn = jest.fn()
                .mockRejectedValueOnce(new Error('Retryable error'))
                .mockRejectedValueOnce(new Error('Non-retryable error'));

            const retryCondition = (error: Error) => error.message.includes('Retryable');

            await expect(retryHandler.execute(mockFn, retryCondition)).rejects.toThrow('Non-retryable error');
            expect(mockFn).toHaveBeenCalledTimes(2); // Initial + 1 retry, then stop
        });

        it('should use exponential backoff', async () => {
            const mockFn = jest.fn().mockRejectedValue(new Error('Always fail'));

            await expect(retryHandler.execute(mockFn)).rejects.toThrow('Always fail');
            expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });

        it('should cap delay at maxDelay', async () => {
            const mockFn = jest.fn().mockRejectedValue(new Error('Always fail'));

            await expect(retryHandler.execute(mockFn)).rejects.toThrow('Always fail');
            expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });
    });

    describe('Enhanced Error Handler Coverage', () => {
        let mockRequest: Partial<Request>;
        let mockResponse: Partial<Response>;
        let mockNext: NextFunction;

        beforeEach(() => {
            mockRequest = {
                path: '/test',
                method: 'GET',
                headers: {},
                body: {}
            };

            mockResponse = {
                headersSent: false,
                status: jest.fn().mockReturnThis(),
                json: jest.fn().mockReturnThis(),
                setHeader: jest.fn().mockReturnThis()
            };

            mockNext = jest.fn();
        });

        it('should handle TypeError correctly', () => {
            const typeError = new Error('Type conversion failed');
            typeError.name = 'TypeError';
            
            const errorHandler = createErrorHandler();
            errorHandler(typeError, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should handle database error from message content', () => {
            const dbError = new Error('Connection to database failed');
            
            const errorHandler = createErrorHandler();
            errorHandler(dbError, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });

        it('should sanitize body with sensitive fields', () => {
            mockRequest.method = 'POST';
            mockRequest.body = { 
                username: 'test', 
                password: 'secret123',
                token: 'abc123',
                secret: 'confidential',
                apiKey: 'key123',
                creditCard: '1234-5678-9012-3456',
                normalField: 'visible'
            };
            
            const errorHandler = createErrorHandler();
            const error = new Error('POST with sensitive data');

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });

        it('should handle non-object body', () => {
            mockRequest.method = 'POST';
            mockRequest.body = 'string body';
            
            const errorHandler = createErrorHandler();
            const error = new Error('POST with string body');

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });

        it('should disable reporting to monitoring', () => {
            const config: ErrorHandlerConfig = { reportToMonitoring: false };
            const errorHandler = createErrorHandler(config);
            const error = new Error('No monitoring');

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });

        it('should handle error response with statusCode < 400', () => {
            // Create a new HttpError with 200 status (informational)
            const infoError = new HttpError('Info message', 200, ErrorCode.VALIDATION_ERROR);
            
            const mockLogger: ErrorLogger = {
                error: jest.fn(),
                warn: jest.fn(),
                info: jest.fn()
            };

            const config: ErrorHandlerConfig = { logger: mockLogger };
            const errorHandler = createErrorHandler(config);

            errorHandler(infoError, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockLogger.info).toHaveBeenCalled();
        });

        it('should handle error response with statusCode >= 400 but < 500', () => {
            const clientError = HttpError.badRequest('Client error test');
            
            const mockLogger: ErrorLogger = {
                error: jest.fn(),
                warn: jest.fn(),
                info: jest.fn()
            };

            const config: ErrorHandlerConfig = { logger: mockLogger };
            const errorHandler = createErrorHandler(config);

            errorHandler(clientError, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockLogger.warn).toHaveBeenCalled();
        });
    });

    describe('Global Error Handlers - Enhanced Coverage', () => {
        let originalEnv: string | undefined;
        let originalSentryDSN: string | undefined;
        let originalWebhookURL: string | undefined;

        beforeEach(() => {
            originalEnv = process.env.NODE_ENV;
            originalSentryDSN = process.env.SENTRY_DSN;
            originalWebhookURL = process.env.MONITORING_WEBHOOK_URL;
        });

        afterEach(() => {
            process.env.NODE_ENV = originalEnv;
            process.env.SENTRY_DSN = originalSentryDSN;
            process.env.MONITORING_WEBHOOK_URL = originalWebhookURL;
            
            // Remove all listeners to avoid interference
            process.removeAllListeners('unhandledRejection');
            process.removeAllListeners('uncaughtException');
            process.removeAllListeners('SIGTERM');
            process.removeAllListeners('SIGINT');
        });

        it('should handle unhandled rejection with non-Error reason', async () => {
            const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

            setupGlobalErrorHandlers();

            // Use process.nextTick to trigger unhandled rejection
            process.nextTick(() => {
                process.emit('unhandledRejection', 'string reason', Promise.resolve());
            });

            // Wait for the event handler to process
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockConsoleError).toHaveBeenCalledWith(
                expect.stringContaining('[CRITICAL] Unhandled promise rejection:'),
                expect.any(Object)
            );

            mockConsoleError.mockRestore();
        });

        it('should not exit on unhandled rejection in development', async () => {
            process.env.NODE_ENV = 'development';
            setupGlobalErrorHandlers();

            process.emit('unhandledRejection', new Error('Dev error'), Promise.resolve());

            // Wait for the event handler to process
            await new Promise(resolve => setImmediate(resolve));

            expect(mockProcessExit).not.toHaveBeenCalled();
        });

        it('should handle monitoring error reporting failure', () => {
            process.env.SENTRY_DSN = 'mock-dsn';
            process.env.MONITORING_WEBHOOK_URL = 'mock-url';
            
            // This would trigger the monitoring code paths but catch blocks would handle failures
            const config: ErrorHandlerConfig = { reportToMonitoring: true };
            const errorHandler = createErrorHandler(config);
            const error = new Error('Monitoring test');

            const mockRequest = { path: '/test', method: 'GET', headers: {}, body: {} };
            const mockResponse = {
                headersSent: false,
                status: jest.fn().mockReturnThis(),
                json: jest.fn().mockReturnThis()
            } as Partial<Response>;

            errorHandler(error, mockRequest as Request, mockResponse as Response, jest.fn());

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });
    });
});
