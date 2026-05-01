/**
 * @fileoverview QueryBus — routes queries to registered handlers
 * @module tsfox/core/features/events/cqrs
 */

import { QueryBusInterface, QueryHandlerInterface } from '../interfaces/sourcing.interface';

export class QueryBusError extends Error {
  constructor(
    message: string,
    public readonly queryType: string
  ) {
    super(message);
    this.name = 'QueryBusError';
  }
}

/**
 * Synchronous in-process QueryBus.
 *
 * ```ts
 * const bus = new QueryBus();
 * bus.register('GetOrderById', new GetOrderByIdHandler(readModel));
 *
 * const order = await bus.execute<Order>({ type: 'GetOrderById', id: '42' });
 * ```
 */
export class QueryBus implements QueryBusInterface {
  private handlers = new Map<string, QueryHandlerInterface>();

  register(queryType: string, handler: QueryHandlerInterface): void {
    if (this.handlers.has(queryType)) {
      throw new QueryBusError(
        `Handler already registered for query: ${queryType}`,
        queryType
      );
    }
    this.handlers.set(queryType, handler);
  }

  unregister(queryType: string): void {
    this.handlers.delete(queryType);
  }

  async execute<T>(query: any): Promise<T> {
    const type: string = query?.type ?? query?.constructor?.name;
    if (!type) {
      throw new QueryBusError('Query must have a "type" property', '<unknown>');
    }

    const handler = this.handlers.get(type);
    if (!handler) {
      throw new QueryBusError(`No handler registered for query: ${type}`, type);
    }

    return handler.handle(query) as Promise<T>;
  }

  getHandlers(): Map<string, QueryHandlerInterface> {
    return new Map(this.handlers);
  }
}
