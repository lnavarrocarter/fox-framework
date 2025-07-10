/**
 * @fileoverview Tests for ID generator utilities
 * @version 1.0.0
 * @since 2025-01-10
 */

import { generateId, generateCorrelationId, generateShortId } from '../../utils/id-generator';

describe('ID Generator Utilities', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });

    it('should generate IDs of specified length', () => {
      const id8 = generateId(8);
      const id16 = generateId(16);
      
      expect(id8.length).toBe(16); // 8 bytes = 16 hex chars
      expect(id16.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('should generate hex-encoded strings', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('generateCorrelationId', () => {
    it('should generate correlation IDs with timestamp and random parts', () => {
      const id = generateCorrelationId();
      
      expect(typeof id).toBe('string');
      expect(id).toContain('-');
      
      const parts = id.split('-');
      expect(parts).toHaveLength(2);
      expect(parts[0].length).toBeGreaterThan(0); // timestamp part
      expect(parts[1].length).toBe(16); // 8 bytes = 16 hex chars
    });

    it('should generate unique correlation IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateShortId', () => {
    it('should generate short 8-character IDs', () => {
      const id = generateShortId();
      
      expect(typeof id).toBe('string');
      expect(id.length).toBe(8); // 4 bytes = 8 hex chars
      expect(id).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique short IDs', () => {
      const id1 = generateShortId();
      const id2 = generateShortId();
      
      expect(id1).not.toBe(id2);
    });
  });
});
