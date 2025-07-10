const { SchemaBuilder } = require('./tsfox/core/features/validation/schema/schema.builder');

console.log('Testing nullable schema...');

// Crear el schema nullable
const schema = SchemaBuilder.nullable(SchemaBuilder.string());

console.log('Schema created:', schema);
console.log('Schema type:', schema.constructor.name);

// Test con string
const stringResult = schema.validate('hello');
console.log('String validation result:', stringResult);

// Test con null
const nullResult = schema.validate(null);
console.log('Null validation result:', nullResult);

// Test individual de NullSchema
const nullSchema = SchemaBuilder.null();
console.log('NullSchema created:', nullSchema);
const nullSchemaResult = nullSchema.validate(null);
console.log('NullSchema validation result:', nullSchemaResult);

// Test individual de StringSchema
const stringSchema = SchemaBuilder.string();
const stringSchemaResult = stringSchema.validate('hello');
console.log('StringSchema validation result:', stringSchemaResult);
