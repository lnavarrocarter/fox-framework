import { routes } from '../routes';
import { RequestMethod } from '../../../tsfox/core/enums/methods.enums';

describe('Server Routes', () => {
    it('should export routes array', () => {
        expect(routes).toBeDefined();
        expect(Array.isArray(routes)).toBe(true);
    });

    it('should contain at least one route', () => {
        expect(routes.length).toBeGreaterThan(0);
    });

    it('should have valid route structure', () => {
        const route = routes[0];
        expect(route).toBeDefined();
        expect(route.method).toBe(RequestMethod.GET);
        expect(route.path).toBe('/test');
        expect(typeof route.callback).toBe('function');
    });

    it('should execute route callback', () => {
        const route = routes[0];
        const mockReq = {};
        const mockRes = {
            json: jest.fn()
        };
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        route.callback(mockReq, mockRes);

        expect(consoleSpy).toHaveBeenCalledWith("Enter to api /test");
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Hello World!' });

        consoleSpy.mockRestore();
    });

    it('should handle route callback with correct parameters', () => {
        const route = routes[0];
        expect(route.callback.length).toBe(2); // Should accept req and res parameters
    });
});
