import {
    RequestType,
    RequestMethodsContext,
    ResponseType,
    ResponseStatus,
    ResponseError,
    ResponseErrorType
} from '../request.enums';
import { RequestMethod } from '../methods.enums';

describe('Request Enums', () => {
    describe('RequestType', () => {
        it('should have correct enum values', () => {
            expect(RequestType.JSON).toBe(0);
            expect(RequestType.FORM_DATA).toBe(1);
            expect(RequestType.URL_ENCODED).toBe(2);
            expect(RequestType.TEXT).toBe(3);
            expect(RequestType.BLOB).toBe(4);
            expect(RequestType.ARRAY_BUFFER).toBe(5);
            expect(RequestType.STREAM).toBe(6);
            expect(RequestType.UNKNOWN).toBe(7);
        });

        it('should have all expected request types', () => {
            const types = Object.keys(RequestType).filter(key => isNaN(Number(key)));
            expect(types).toContain('JSON');
            expect(types).toContain('FORM_DATA');
            expect(types).toContain('URL_ENCODED');
            expect(types).toContain('TEXT');
            expect(types).toContain('BLOB');
            expect(types).toContain('ARRAY_BUFFER');
            expect(types).toContain('STREAM');
            expect(types).toContain('UNKNOWN');
        });
    });

    describe('RequestMethodsContext', () => {
        it('should define correct interface structure', () => {
            const context: RequestMethodsContext = {
                method: RequestMethod.GET,
                path: '/test',
                callback: () => {}
            };

            expect(context.method).toBe(RequestMethod.GET);
            expect(context.path).toBe('/test');
            expect(typeof context.callback).toBe('function');
        });

        it('should work with different HTTP methods', () => {
            const postContext: RequestMethodsContext = {
                method: RequestMethod.POST,
                path: '/api/users',
                callback: (req: any, res: any) => res.json({ success: true })
            };

            expect(postContext.method).toBe(RequestMethod.POST);
            expect(postContext.path).toBe('/api/users');
            expect(typeof postContext.callback).toBe('function');
        });
    });

    describe('ResponseType', () => {
        it('should have correct enum values', () => {
            expect(ResponseType.JSON).toBe(0);
            expect(ResponseType.TEXT).toBe(1);
            expect(ResponseType.BLOB).toBe(2);
            expect(ResponseType.ARRAY_BUFFER).toBe(3);
            expect(ResponseType.STREAM).toBe(4);
            expect(ResponseType.UNKNOWN).toBe(5);
        });

        it('should have all expected response types', () => {
            const types = Object.keys(ResponseType).filter(key => isNaN(Number(key)));
            expect(types).toContain('JSON');
            expect(types).toContain('TEXT');
            expect(types).toContain('BLOB');
            expect(types).toContain('ARRAY_BUFFER');
            expect(types).toContain('STREAM');
            expect(types).toContain('UNKNOWN');
        });
    });

    describe('ResponseStatus', () => {
        it('should have correct enum values', () => {
            expect(ResponseStatus.SUCCESS).toBe(0);
            expect(ResponseStatus.ERROR).toBe(1);
            expect(ResponseStatus.TIMEOUT).toBe(2);
            expect(ResponseStatus.ABORTED).toBe(3);
            expect(ResponseStatus.UNKNOWN).toBe(4);
        });

        it('should have all expected status types', () => {
            const statuses = Object.keys(ResponseStatus).filter(key => isNaN(Number(key)));
            expect(statuses).toContain('SUCCESS');
            expect(statuses).toContain('ERROR');
            expect(statuses).toContain('TIMEOUT');
            expect(statuses).toContain('ABORTED');
            expect(statuses).toContain('UNKNOWN');
        });
    });

    describe('ResponseError', () => {
        it('should have correct enum values', () => {
            expect(ResponseError.TIMEOUT).toBe(0);
            expect(ResponseError.ABORTED).toBe(1);
            expect(ResponseError.UNKNOWN).toBe(2);
        });

        it('should have all expected error types', () => {
            const errors = Object.keys(ResponseError).filter(key => isNaN(Number(key)));
            expect(errors).toContain('TIMEOUT');
            expect(errors).toContain('ABORTED');
            expect(errors).toContain('UNKNOWN');
        });
    });

    describe('ResponseErrorType', () => {
        it('should have correct enum values', () => {
            expect(ResponseErrorType.TIMEOUT).toBe(0);
            expect(ResponseErrorType.ABORTED).toBe(1);
            expect(ResponseErrorType.UNKNOWN).toBe(2);
        });

        it('should have all expected error types', () => {
            const errorTypes = Object.keys(ResponseErrorType).filter(key => isNaN(Number(key)));
            expect(errorTypes).toContain('TIMEOUT');
            expect(errorTypes).toContain('ABORTED');
            expect(errorTypes).toContain('UNKNOWN');
        });

        it('should match ResponseError values', () => {
            expect(ResponseErrorType.TIMEOUT).toBe(ResponseError.TIMEOUT);
            expect(ResponseErrorType.ABORTED).toBe(ResponseError.ABORTED);
            expect(ResponseErrorType.UNKNOWN).toBe(ResponseError.UNKNOWN);
        });
    });

    describe('Integration', () => {
        it('should work together in realistic scenarios', () => {
            const requestContext: RequestMethodsContext = {
                method: RequestMethod.POST,
                path: '/api/upload',
                callback: (req: any, res: any) => {
                    // Simulate handling different request types
                    let requestType: RequestType;
                    
                    if (req.is('application/json')) {
                        requestType = RequestType.JSON;
                    } else if (req.is('multipart/form-data')) {
                        requestType = RequestType.FORM_DATA;
                    } else {
                        requestType = RequestType.UNKNOWN;
                    }

                    // Simulate response
                    res.json({ 
                        requestType,
                        status: ResponseStatus.SUCCESS,
                        responseType: ResponseType.JSON
                    });
                }
            };

            expect(requestContext.method).toBe(RequestMethod.POST);
            expect(requestContext.path).toBe('/api/upload');
            expect(typeof requestContext.callback).toBe('function');
        });

        it('should handle error scenarios', () => {
            const handleError = (errorType: ResponseError) => {
                let status: ResponseStatus;
                let errorTypeCheck: ResponseErrorType;

                switch (errorType) {
                    case ResponseError.TIMEOUT:
                        status = ResponseStatus.TIMEOUT;
                        errorTypeCheck = ResponseErrorType.TIMEOUT;
                        break;
                    case ResponseError.ABORTED:
                        status = ResponseStatus.ABORTED;
                        errorTypeCheck = ResponseErrorType.ABORTED;
                        break;
                    default:
                        status = ResponseStatus.UNKNOWN;
                        errorTypeCheck = ResponseErrorType.UNKNOWN;
                }

                return { status, errorType: errorTypeCheck };
            };

            const timeoutResult = handleError(ResponseError.TIMEOUT);
            expect(timeoutResult.status).toBe(ResponseStatus.TIMEOUT);
            expect(timeoutResult.errorType).toBe(ResponseErrorType.TIMEOUT);

            const abortedResult = handleError(ResponseError.ABORTED);
            expect(abortedResult.status).toBe(ResponseStatus.ABORTED);
            expect(abortedResult.errorType).toBe(ResponseErrorType.ABORTED);
        });
    });
});
