/**
 * @fileoverview Tests for schema builder
 */

import { SchemaBuilder } from '../schema/schema.builder';

describe('SchemaBuilder', () => {
  describe('string schemas', () => {
    it('should create string schema', () => {
      const schema = SchemaBuilder.string();
      
      expect(schema.validate('hello').success).toBe(true);
      // Numbers get converted to strings by default
      expect(schema.validate(123).success).toBe(true);
      expect(schema.validate(123).data).toBe('123');
    });

    it('should create string schema with constraints', () => {
      const schema = SchemaBuilder.string()
        .min(3)
        .max(20)
        .email();
      
      expect(schema.validate('user@example.com').success).toBe(true);
      expect(schema.validate('ab').success).toBe(false); // too short
      expect(schema.validate('not-an-email').success).toBe(false); // not email
    });
  });

  describe('number schemas', () => {
    it('should create number schema', () => {
      const schema = SchemaBuilder.number();
      
      expect(schema.validate(42).success).toBe(true);
      // Strings get converted to numbers by default
      expect(schema.validate('42').success).toBe(true);
      expect(schema.validate('42').data).toBe(42);
    });

    it('should create number schema with constraints', () => {
      const schema = SchemaBuilder.number()
        .min(0)
        .max(100)
        .integer();
      
      expect(schema.validate(50).success).toBe(true);
      expect(schema.validate(-5).success).toBe(false); // below min
      expect(schema.validate(50.5).success).toBe(false); // not integer
    });
  });

  describe('object schemas', () => {
    it('should create object schema', () => {
      const schema = SchemaBuilder.object();
      
      expect(schema.validate({}).success).toBe(true);
      expect(schema.validate({ key: 'value' }).success).toBe(true);
    });

    it('should create object schema with shape', () => {
      const schema = SchemaBuilder.object({
        name: SchemaBuilder.string().required(),
        age: SchemaBuilder.number().min(0).optional()
      });
      
      expect(schema.validate({ name: 'John', age: 30 }).success).toBe(true);
      expect(schema.validate({ name: 'John' }).success).toBe(true); // age is optional
      expect(schema.validate({ age: 30 }).success).toBe(false); // name is required
    });
  });

  describe('array schemas', () => {
    it('should create array schema', () => {
      const schema = SchemaBuilder.array();
      
      expect(schema.validate([]).success).toBe(true);
      expect(schema.validate([1, 2, 3]).success).toBe(true);
    });

    it('should create array schema with item type', () => {
      const schema = SchemaBuilder.array(SchemaBuilder.string());
      
      expect(schema.validate(['a', 'b', 'c']).success).toBe(true);
      // Numbers get converted to strings
      expect(schema.validate([1, 2, 3]).success).toBe(true);
    });
  });

  describe('boolean schemas', () => {
    it('should create boolean schema', () => {
      const schema = SchemaBuilder.boolean();
      
      expect(schema.validate(true).success).toBe(true);
      expect(schema.validate(false).success).toBe(true);
    });
  });

  describe('literal schemas', () => {
    it('should create literal string schema', () => {
      const schema = SchemaBuilder.literal('success');
      
      expect(schema.validate('success').success).toBe(true);
      expect(schema.validate('failure').success).toBe(false);
    });

    it('should create literal number schema', () => {
      const schema = SchemaBuilder.literal(42);
      
      expect(schema.validate(42).success).toBe(true);
      expect(schema.validate(43).success).toBe(false);
    });
  });

  describe('union schemas', () => {
    it('should create union schema', () => {
      const schema = SchemaBuilder.union(
        SchemaBuilder.string(),
        SchemaBuilder.number()
      );
      
      expect(schema.validate('hello').success).toBe(true);
      expect(schema.validate(42).success).toBe(true);
      expect(schema.validate(true).success).toBe(true); // boolean gets converted
    });
  });

  describe('enum schemas', () => {
    it('should create enum schema', () => {
      const schema = SchemaBuilder.enum(['red', 'green', 'blue']);
      
      expect(schema.validate('red').success).toBe(true);
      expect(schema.validate('yellow').success).toBe(false);
    });
  });

  describe('nullable and optional schemas', () => {
    it('should create nullable schema', () => {
      const schema = SchemaBuilder.nullable(SchemaBuilder.string());
      
      expect(schema.validate('hello').success).toBe(true);
      expect(schema.validate(null).success).toBe(true);
    });

    it('should create optional schema', () => {
      const schema = SchemaBuilder.optional(SchemaBuilder.string());
      
      expect(schema.validate('hello').success).toBe(true);
      expect(schema.validate(undefined).success).toBe(true);
    });
  });

  describe('complex schemas', () => {
    it('should create complex nested schema', () => {
      const userSchema = SchemaBuilder.object({
        id: SchemaBuilder.number().positive().required(),
        name: SchemaBuilder.string().min(1).required(),
        email: SchemaBuilder.string().email().required(),
        age: SchemaBuilder.number().min(0).max(150).optional(),
        tags: SchemaBuilder.array(SchemaBuilder.string()).optional()
      });

      const validUser = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        tags: ['developer', 'typescript']
      };

      const result = userSchema.validate(validUser);
      expect(result.success).toBe(true);

      const invalidUser = {
        id: -1, // negative ID
        name: '', // empty name
        email: 'invalid-email', // not email format
        age: 200 // age too high
      };

      const invalidResult = userSchema.validate(invalidUser);
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.errors!.length).toBeGreaterThan(0);
    });
  });
});
