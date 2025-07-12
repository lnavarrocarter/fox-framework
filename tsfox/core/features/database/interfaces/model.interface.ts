/**
 * @fileoverview Model interfaces for ORM/ODM functionality
 * @module tsfox/core/features/database/interfaces
 */

import { QueryBuilderInterface, QueryResult, WhereCondition } from './database.interface';
import { ValidationRule } from './config.interface';

/**
 * Base model interface
 */
export interface ModelInterface<T = any> {
  /** Find record by ID */
  find(id: any): Promise<T | null>;
  
  /** Find multiple records */
  findMany(conditions?: any): Promise<T[]>;
  
  /** Find first record matching conditions */
  findFirst(conditions?: any): Promise<T | null>;
  
  /** Find all records */
  findAll(): Promise<T[]>;
  
  /** Create new record */
  create(data: Partial<T>): Promise<T>;
  
  /** Create multiple records */
  createMany(data: Partial<T>[]): Promise<T[]>;
  
  /** Update record by ID */
  update(id: any, data: Partial<T>): Promise<T | null>;
  
  /** Update multiple records */
  updateMany(conditions: any, data: Partial<T>): Promise<number>;
  
  /** Delete record by ID */
  delete(id: any): Promise<boolean>;
  
  /** Delete multiple records */
  deleteMany(conditions?: any): Promise<number>;
  
  /** Count records */
  count(conditions?: any): Promise<number>;
  
  /** Check if record exists */
  exists(conditions: any): Promise<boolean>;
  
  /** Get query builder */
  query(): QueryBuilderInterface;
  
  /** Get model metadata */
  getMetadata(): ModelMetadata;
  
  /** Get model schema */
  getSchema(): ModelSchema;
  
  /** Validate data */
  validate(data: any): Promise<ValidationResult>;
  
  /** Save record */
  save(record: T): Promise<T>;
  
  /** Refresh record from database */
  refresh(record: T): Promise<T>;
}

/**
 * Repository interface
 */
export interface RepositoryInterface<T = any> {
  /** Get model instance */
  getModel(): ModelInterface<T>;
  
  /** Find by ID */
  findById(id: any): Promise<T | null>;
  
  /** Find by conditions */
  findBy(conditions: any): Promise<T[]>;
  
  /** Find one by conditions */
  findOneBy(conditions: any): Promise<T | null>;
  
  /** Save entity */
  save(entity: T): Promise<T>;
  
  /** Remove entity */
  remove(entity: T): Promise<void>;
  
  /** Create and save entity */
  create(data: Partial<T>): Promise<T>;
  
  /** Update entity */
  update(id: any, data: Partial<T>): Promise<T | null>;
  
  /** Delete by ID */
  delete(id: any): Promise<boolean>;
  
  /** Count entities */
  count(conditions?: any): Promise<number>;
  
  /** Create query builder */
  createQueryBuilder(): QueryBuilderInterface;
  
  /** Execute raw query */
  query(sql: string, params?: any[]): Promise<any[]>;
  
  /** Begin transaction */
  transaction<R>(callback: (repo: RepositoryInterface<T>) => Promise<R>): Promise<R>;
}

/**
 * Model metadata interface
 */
export interface ModelMetadata {
  /** Model name */
  name: string;
  
  /** Table/Collection name */
  tableName: string;
  
  /** Primary key field */
  primaryKey: string | string[];
  
  /** Model fields */
  fields: ModelField[];
  
  /** Relations */
  relations: ModelRelation[];
  
  /** Indexes */
  indexes: ModelIndex[];
  
  /** Model options */
  options: ModelOptions;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Update timestamp */
  updatedAt: Date;
}

/**
 * Model schema interface
 */
export interface ModelSchema {
  /** Schema version */
  version: string;
  
  /** Field definitions */
  fields: SchemaField[];
  
  /** Validation rules */
  validation: ValidationRule[];
  
  /** Schema options */
  options: SchemaOptions;
}

/**
 * Model field interface
 */
export interface ModelField {
  /** Field name */
  name: string;
  
  /** Field type */
  type: FieldType;
  
  /** Field length */
  length?: number;
  
  /** Whether field is required */
  required: boolean;
  
  /** Whether field is unique */
  unique: boolean;
  
  /** Default value */
  defaultValue?: any;
  
  /** Field validation */
  validation?: FieldValidation[];
  
  /** Field transformer */
  transformer?: FieldTransformer;
  
  /** Field metadata */
  metadata?: Record<string, any>;
}

/**
 * Schema field interface
 */
export interface SchemaField {
  /** Field name */
  name: string;
  
  /** Field type */
  type: SchemaFieldType;
  
  /** Field description */
  description?: string;
  
  /** Whether field is required */
  required?: boolean;
  
  /** Field constraints */
  constraints?: FieldConstraints;
  
  /** Field metadata */
  metadata?: Record<string, any>;
}

/**
 * Model relation interface
 */
export interface ModelRelation {
  /** Relation name */
  name: string;
  
  /** Relation type */
  type: RelationType;
  
  /** Target model */
  target: string;
  
  /** Local key */
  localKey: string;
  
  /** Foreign key */
  foreignKey: string;
  
  /** Pivot table (for many-to-many) */
  pivotTable?: string;
  
  /** Relation options */
  options?: RelationOptions;
}

/**
 * Model index interface
 */
export interface ModelIndex {
  /** Index name */
  name: string;
  
  /** Index fields */
  fields: string[];
  
  /** Whether index is unique */
  unique: boolean;
  
  /** Index type */
  type?: string;
  
  /** Index options */
  options?: Record<string, any>;
}

/**
 * Model options interface
 */
export interface ModelOptions {
  /** Timestamps */
  timestamps?: boolean;
  
  /** Soft deletes */
  softDeletes?: boolean;
  
  /** Version control */
  versioning?: boolean;
  
  /** Caching */
  cache?: CacheOptions;
  
  /** Hooks */
  hooks?: ModelHooks;
  
  /** Custom options */
  custom?: Record<string, any>;
}

/**
 * Schema options interface
 */
export interface SchemaOptions {
  /** Strict mode */
  strict?: boolean;
  
  /** Additional properties */
  additionalProperties?: boolean;
  
  /** Schema ID */
  id?: string;
  
  /** Schema title */
  title?: string;
  
  /** Schema description */
  description?: string;
}

/**
 * Field validation interface
 */
export interface FieldValidation {
  /** Validation type */
  type: ValidationType;
  
  /** Validation value */
  value?: any;
  
  /** Error message */
  message?: string;
  
  /** Custom validator */
  validator?: (value: any) => boolean | Promise<boolean>;
}

/**
 * Field constraints interface
 */
export interface FieldConstraints {
  /** Minimum value */
  min?: number;
  
  /** Maximum value */
  max?: number;
  
  /** Pattern */
  pattern?: string;
  
  /** Enum values */
  enum?: any[];
  
  /** Custom constraint */
  custom?: (value: any) => boolean;
}

/**
 * Field transformer interface
 */
export interface FieldTransformer {
  /** Transform for database */
  toDB: (value: any) => any;
  
  /** Transform from database */
  fromDB: (value: any) => any;
}

/**
 * Relation options interface
 */
export interface RelationOptions {
  /** Cascade delete */
  cascade?: boolean;
  
  /** Eager loading */
  eager?: boolean;
  
  /** Lazy loading */
  lazy?: boolean;
  
  /** On delete action */
  onDelete?: 'cascade' | 'set null' | 'restrict';
  
  /** Custom options */
  custom?: Record<string, any>;
}

/**
 * Cache options interface
 */
export interface CacheOptions {
  /** Enable caching */
  enabled: boolean;
  
  /** Cache TTL */
  ttl?: number;
  
  /** Cache key prefix */
  prefix?: string;
  
  /** Cache tags */
  tags?: string[];
}

/**
 * Model hooks interface
 */
export interface ModelHooks {
  /** Before create */
  beforeCreate?: (data: any) => Promise<any>;
  
  /** After create */
  afterCreate?: (record: any) => Promise<void>;
  
  /** Before update */
  beforeUpdate?: (record: any, data: any) => Promise<any>;
  
  /** After update */
  afterUpdate?: (record: any) => Promise<void>;
  
  /** Before delete */
  beforeDelete?: (record: any) => Promise<void>;
  
  /** After delete */
  afterDelete?: (record: any) => Promise<void>;
  
  /** Before save */
  beforeSave?: (record: any) => Promise<any>;
  
  /** After save */
  afterSave?: (record: any) => Promise<void>;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  
  /** Validation errors */
  errors: ValidationError[];
  
  /** Validated data */
  data?: any;
}

/**
 * Validation error interface
 */
export interface ValidationError {
  /** Field name */
  field: string;
  
  /** Error message */
  message: string;
  
  /** Error code */
  code: string;
  
  /** Error value */
  value?: any;
}

/**
 * Entity interface
 */
export interface EntityInterface {
  /** Entity ID */
  id?: any;
  
  /** Creation timestamp */
  createdAt?: Date;
  
  /** Update timestamp */
  updatedAt?: Date;
  
  /** Soft delete timestamp */
  deletedAt?: Date;
  
  /** Entity version */
  version?: number;
}

/**
 * Active Record interface
 */
export interface ActiveRecordInterface<T = any> extends EntityInterface {
  /** Save record */
  save(): Promise<T>;
  
  /** Delete record */
  delete(): Promise<boolean>;
  
  /** Refresh from database */
  refresh(): Promise<T>;
  
  /** Get changes */
  getChanges(): Record<string, any>;
  
  /** Check if dirty */
  isDirty(): boolean;
  
  /** Check if new record */
  isNew(): boolean;
  
  /** Validate record */
  validate(): Promise<ValidationResult>;
  
  /** Convert to JSON */
  toJSON(): any;
  
  /** Convert to plain object */
  toObject(): any;
}

/**
 * Query scope interface
 */
export interface QueryScopeInterface {
  /** Apply scope to query builder */
  apply(builder: QueryBuilderInterface): QueryBuilderInterface;
  
  /** Scope name */
  readonly name: string;
  
  /** Scope parameters */
  readonly parameters: any[];
}

/**
 * Model events interface
 */
export interface ModelEventsInterface {
  /** Emit model event */
  emit(event: string, data: any): Promise<void>;
  
  /** Listen to model event */
  on(event: string, handler: (data: any) => Promise<void>): void;
  
  /** Listen once to model event */
  once(event: string, handler: (data: any) => Promise<void>): void;
  
  /** Remove event listener */
  off(event: string, handler?: (data: any) => Promise<void>): void;
}

/**
 * Field types
 */
export type FieldType = 
  | 'string' 
  | 'number' 
  | 'integer'
  | 'float'
  | 'boolean' 
  | 'date' 
  | 'datetime'
  | 'timestamp'
  | 'json'
  | 'array'
  | 'object'
  | 'text'
  | 'uuid'
  | 'enum';

/**
 * Schema field types
 */
export type SchemaFieldType = 
  | 'string' 
  | 'number' 
  | 'integer'
  | 'boolean' 
  | 'null'
  | 'object' 
  | 'array';

/**
 * Relation types
 */
export type RelationType = 
  | 'hasOne' 
  | 'hasMany' 
  | 'belongsTo' 
  | 'belongsToMany'
  | 'morphTo'
  | 'morphOne'
  | 'morphMany';

/**
 * Validation types
 */
export type ValidationType = 
  | 'required' 
  | 'min' 
  | 'max' 
  | 'length'
  | 'minLength'
  | 'maxLength'
  | 'pattern' 
  | 'email'
  | 'url'
  | 'enum' 
  | 'custom'
  | 'unique'
  | 'exists';

/**
 * Model events
 */
export type ModelEvent = 
  | 'creating' 
  | 'created' 
  | 'updating' 
  | 'updated' 
  | 'deleting' 
  | 'deleted'
  | 'saving'
  | 'saved'
  | 'retrieving'
  | 'retrieved';
