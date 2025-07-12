/**
 * @fileoverview Performance optimization modules
 * @module tsfox/core/performance/optimization
 */

export { RouterOptimizer, FastPathMatcher } from './router.optimizer';
export type { RouterOptimizationOptions, CompiledRoute } from './router.optimizer';

export { MemoryOptimizer, ObjectPool, MemoryLeakDetector } from './memory.optimizer';
export type { MemoryOptimizationOptions, MemoryLeak } from './memory.optimizer';

export { HttpOptimizer, HttpResponseCache, HttpConnectionPool } from './http.optimizer';
export type { HttpOptimizationOptions } from './http.optimizer';

export { TemplateOptimizer, TemplateCache, TemplateCompiler } from './template.optimizer';
export type { TemplateOptimizationOptions, CompiledTemplate } from './template.optimizer';
