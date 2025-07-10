import {
    FoxError,
    HttpError,
    ValidationError,
    SystemError,
    BusinessError,
    ErrorFactory,
    ErrorUtils,
    ErrorCode,
    ErrorContext,
    ValidationField
} from '../error.enhanced';

describe('Error Enhanced System', () => {
    describe('ErrorCode enum', () => {
        it('should have all required error codes', () => {
            expect(ErrorCode.BAD_REQUEST).toBe('BAD_REQUEST');
            expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
            expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
            expect(ErrorCode.INTERNAL_SERVER_ERROR).toBe('INTERNAL_SERVER_ERROR');
            expect(ErrorCode.DATABASE_ERROR).toBe('DATABASE_ERROR');
            expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
        });
    });

    describe('HttpError', () => {
        it('should create HttpError with default code mapping', () => {
            const error = new HttpError('Not found', 404);
            
            expect(error.message).toBe('Not found');
            expect(error.statusCode).toBe(404);
            expect(error.code).toBe(ErrorCode.NOT_FOUND);
            expect(error.isOperational).toBe(true);
            expect(error.context.timestamp).toBeInstanceOf(Date);
        });

        it('should create HttpError with custom code', () => {
            const error = new HttpError('Bad request', 400, ErrorCode.VALIDATION_ERROR);
            
            expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
            expect(error.statusCode).toBe(400);
        });

        it('should create HttpError with context', () => {
            const context = {
                requestId: 'test-123',
                path: '/api/test',
                method: 'GET'
            };
            const error = new HttpError('Server error', 500, undefined, context);
            
            expect(error.context.requestId).toBe('test-123');
            expect(error.context.path).toBe('/api/test');
            expect(error.context.method).toBe('GET');
        });

        it('should convert to JSON', () => {
            const error = new HttpError('Test error', 400);
            const json = error.toJSON();
            
            expect(json.name).toBe('HttpError');
            expect(json.message).toBe('Test error');
            expect(json.code).toBe(ErrorCode.BAD_REQUEST);
            expect(json.statusCode).toBe(400);
            expect(json.timestamp).toBeInstanceOf(Date);
        });

        it('should convert to HTTP response', () => {
            const error = new HttpError('Test error', 400, ErrorCode.BAD_REQUEST, { requestId: 'test-123' });
            const response = error.toHttpResponse();
            
            expect(response.error.message).toBe('Test error');
            expect(response.error.code).toBe('BAD_REQUEST');
            expect(response.error.requestId).toBe('test-123');
            expect(typeof response.error.timestamp).toBe('string');
        });

        describe('Status code mapping', () => {
            it('should map 400 to BAD_REQUEST', () => {
                expect(HttpError.getCodeFromStatus(400)).toBe(ErrorCode.BAD_REQUEST);
            });

            it('should map 401 to UNAUTHORIZED', () => {
                expect(HttpError.getCodeFromStatus(401)).toBe(ErrorCode.UNAUTHORIZED);
            });

            it('should map 404 to NOT_FOUND', () => {
                expect(HttpError.getCodeFromStatus(404)).toBe(ErrorCode.NOT_FOUND);
            });

            it('should map 500 to INTERNAL_SERVER_ERROR', () => {
                expect(HttpError.getCodeFromStatus(500)).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
            });
        });

        describe('Convenience methods', () => {
            it('should create bad request error', () => {
                const error = HttpError.badRequest('Invalid input');
                expect(error.statusCode).toBe(400);
                expect(error.code).toBe(ErrorCode.BAD_REQUEST);
                expect(error.message).toBe('Invalid input');
            });

            it('should create not found error', () => {
                const error = HttpError.notFound('Resource not found');
                expect(error.statusCode).toBe(404);
                expect(error.code).toBe(ErrorCode.NOT_FOUND);
            });

            it('should create unauthorized error', () => {
                const error = HttpError.unauthorized();
                expect(error.statusCode).toBe(401);
                expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
                expect(error.message).toBe('Unauthorized');
            });
        });
    });

    describe('ValidationError', () => {
        it('should create ValidationError', () => {
            const fields: ValidationField[] = [
                { field: 'email', message: 'Invalid email' },
                { field: 'password', message: 'Too short' }
            ];
            const error = new ValidationError('Validation failed', fields);
            
            expect(error.statusCode).toBe(422);
            expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
            expect(error.fields).toEqual(fields);
        });

        it('should include validation errors in HTTP response', () => {
            const fields: ValidationField[] = [{ field: 'name', message: 'Required' }];
            const error = new ValidationError('Validation failed', fields);
            const response = error.toHttpResponse();
            
            expect(response.error.details).toEqual({ fields: fields });
        });

        it('should create field error', () => {
            const error = ValidationError.fieldError('email', 'Invalid format', 'test@');
            expect(error.fields.length).toBe(1);
            expect(error.fields[0]).toEqual({
                field: 'email',
                message: 'Invalid format',
                value: 'test@'
            });
        });

        it('should create multiple fields error', () => {
            const fields: ValidationField[] = [
                { field: 'name', message: 'Required' },
                { field: 'email', message: 'Invalid' }
            ];
            const error = ValidationError.multipleFields(fields);
            expect(error.message).toBe('Multiple validation errors');
            expect(error.fields).toEqual(fields);
        });
    });

    describe('SystemError', () => {
        it('should create SystemError', () => {
            const error = new SystemError('Connection failed', ErrorCode.DATABASE_ERROR);
            
            expect(error.statusCode).toBe(500);
            expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
            expect(error.isOperational).toBe(false);
        });

        it('should create database error', () => {
            const error = SystemError.database('Query failed');
            expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
        });

        it('should create network error', () => {
            const error = SystemError.network('Connection timeout');
            expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
        });

        it('should create filesystem error', () => {
            const error = SystemError.filesystem('File not found');
            expect(error.code).toBe(ErrorCode.FILESYSTEM_ERROR);
        });

        it('should include cause error details', () => {
            const cause = new Error('Original error');
            const error = new SystemError('System failed', ErrorCode.INTERNAL_SERVER_ERROR, {}, cause);
            
            expect(error.context.metadata?.cause.name).toBe('Error');
            expect(error.context.metadata?.cause.message).toBe('Original error');
        });
    });

    describe('BusinessError', () => {
        it('should create BusinessError', () => {
            const error = new BusinessError('Insufficient balance');
            
            expect(error.statusCode).toBe(400);
            expect(error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
        });

        it('should create rule violation error', () => {
            const error = BusinessError.ruleViolation('Account locked');
            expect(error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
        });

        it('should create resource not available error', () => {
            const error = BusinessError.resourceNotAvailable('Service unavailable');
            expect(error.code).toBe(ErrorCode.RESOURCE_NOT_AVAILABLE);
        });

        it('should create operation not permitted error', () => {
            const error = BusinessError.operationNotPermitted('Access denied');
            expect(error.code).toBe(ErrorCode.OPERATION_NOT_PERMITTED);
        });
    });

    describe('ErrorFactory', () => {
        it('should create error from HTTP status', () => {
            const error = ErrorFactory.fromHttpStatus(404, 'Not found');
            expect(error.statusCode).toBe(404);
            expect(error.message).toBe('Not found');
            expect(error.code).toBe(ErrorCode.NOT_FOUND);
        });

        it('should create error with default message', () => {
            const error = ErrorFactory.fromHttpStatus(500);
            expect(error.message).toBe('Internal Server Error');
        });

        it('should create error from existing FoxError', () => {
            const originalError = new HttpError('Test error', 400);
            const error = ErrorFactory.fromError(originalError);
            expect(error).toBe(originalError);
        });

        it('should create error from generic Error', () => {
            const originalError = new Error('Generic error');
            const error = ErrorFactory.fromError(originalError);
            expect(error).toBeInstanceOf(SystemError);
            expect(error.message).toBe('Generic error');
        });

        it('should create error from Error with statusCode', () => {
            const originalError = new Error('Custom error') as any;
            originalError.statusCode = 422;
            const error = ErrorFactory.fromError(originalError);
            expect(error).toBeInstanceOf(HttpError);
            expect(error.statusCode).toBe(422);
        });
    });

    describe('ErrorUtils', () => {
        it('should check if error is operational', () => {
            const operationalError = new HttpError('Not found', 404);
            expect(ErrorUtils.isOperational(operationalError)).toBe(true);

            const systemError = new SystemError('System error', ErrorCode.INTERNAL_SERVER_ERROR);
            expect(ErrorUtils.isOperational(systemError)).toBe(false);

            const genericError = new Error('Generic error');
            expect(ErrorUtils.isOperational(genericError)).toBe(false);
        });

        it('should sanitize error for logging', () => {
            const error = new HttpError('Test error', 400, ErrorCode.BAD_REQUEST, { requestId: 'test-123' });
            const sanitized = ErrorUtils.sanitizeForLogging(error);
            
            expect(sanitized.name).toBe('HttpError');
            expect(sanitized.message).toBe('Test error');
            expect(sanitized.code).toBe(ErrorCode.BAD_REQUEST);
            expect(sanitized.statusCode).toBe(400);
            expect(sanitized.context.requestId).toBe('test-123');
            expect(sanitized.isOperational).toBe(true);
        });

        it('should create client response from FoxError', () => {
            const error = new HttpError('Not found', 404);
            const response = ErrorUtils.createClientResponse(error);
            
            expect(response.error.message).toBe('Not found');
            expect(response.error.code).toBe('NOT_FOUND');
        });

        it('should create safe client response from generic Error', () => {
            const error = new Error('Internal error');
            const response = ErrorUtils.createClientResponse(error);
            
            expect(response.error.message).toBe('Internal Server Error');
            expect(response.error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
        });

        it('should determine if error should be reported', () => {
            const clientError = new HttpError('Bad request', 400);
            expect(ErrorUtils.shouldReport(clientError)).toBe(false);

            const authError = new HttpError('Unauthorized', 401);
            expect(ErrorUtils.shouldReport(authError)).toBe(true);

            const serverError = new HttpError('Internal error', 500);
            expect(ErrorUtils.shouldReport(serverError)).toBe(true);

            const genericError = new Error('Generic error');
            expect(ErrorUtils.shouldReport(genericError)).toBe(true);
        });
    });
});
