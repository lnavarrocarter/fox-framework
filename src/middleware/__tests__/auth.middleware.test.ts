import { AuthMiddlewareMiddleware, createAuthMiddlewareMiddleware } from './authmiddleware.middleware';
import { Request, Response, NextFunction } from 'express';

describe('AuthMiddlewareMiddleware', () => {
    let middleware: AuthMiddlewareMiddleware;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        middleware = new AuthMiddlewareMiddleware();
        mockRequest = {
            method: 'GET',
            path: '/test'
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        mockNext = jest.fn();
    });

    it('should call next() when enabled', async () => {
        await middleware.handle(mockRequest as Request, mockResponse as Response, mockNext);
        
        expect(mockNext).toHaveBeenCalled();
    });

    it('should skip when disabled', async () => {
        middleware.updateConfig({ enabled: false });
        
        await middleware.handle(mockRequest as Request, mockResponse as Response, mockNext);
        
        expect(mockNext).toHaveBeenCalled();
    });

    it('should create middleware with factory function', () => {
        const middlewareHandler = createAuthMiddlewareMiddleware({ enabled: true });
        
        expect(typeof middlewareHandler).toBe('function');
    });
});