import { config } from '../config';
import { ServerConfig } from '../../../tsfox';

describe('Server Config', () => {
    it('should export valid server configuration', () => {
        expect(config).toBeDefined();
        expect(config.port).toBe(3000);
        expect(config.env).toBe('development');
        expect(config.jsonSpaces).toBe(0);
        expect(config.staticFolder).toBe('public');
    });

    it('should have requests configuration', () => {
        expect(config.requests).toBeDefined();
        expect(Array.isArray(config.requests)).toBe(true);
    });

    it('should have views configuration', () => {
        expect(config.views).toBeDefined();
        expect(Array.isArray(config.views)).toBe(true);
    });

    it('should match ServerConfig interface', () => {
        // Validate that config has all required properties
        expect(typeof config.port).toBe('number');
        expect(typeof config.env).toBe('string');
        expect(typeof config.jsonSpaces).toBe('number');
        expect(typeof config.staticFolder).toBe('string');
        expect(Array.isArray(config.requests)).toBe(true);
        expect(Array.isArray(config.views)).toBe(true);
    });
});
