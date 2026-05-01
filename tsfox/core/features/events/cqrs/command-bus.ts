/**
 * @fileoverview CommandBus — routes commands to registered handlers
 * @module tsfox/core/features/events/cqrs
 */

import { EventInterface } from '../interfaces/event.interface';
import {
  CommandBusInterface,
  CommandHandlerInterface
} from '../interfaces/sourcing.interface';

export class CommandBusError extends Error {
  constructor(
    message: string,
    public readonly commandType: string
  ) {
    super(message);
    this.name = 'CommandBusError';
  }
}

/**
 * Synchronous in-process CommandBus.
 *
 * ```ts
 * const bus = new CommandBus();
 * bus.register('CreateOrder', new CreateOrderHandler(repo));
 *
 * const events = await bus.send({ type: 'CreateOrder', aggregateId: '1', data: { ... } });
 * ```
 */
export class CommandBus implements CommandBusInterface {
  private handlers = new Map<string, CommandHandlerInterface>();

  register(commandType: string, handler: CommandHandlerInterface): void {
    if (this.handlers.has(commandType)) {
      throw new CommandBusError(
        `Handler already registered for command: ${commandType}`,
        commandType
      );
    }
    this.handlers.set(commandType, handler);
  }

  unregister(commandType: string): void {
    this.handlers.delete(commandType);
  }

  /**
   * Send a command and return the resulting domain events.
   */
  async send(command: any): Promise<void> {
    const type: string = command?.type ?? command?.constructor?.name;
    if (!type) {
      throw new CommandBusError('Command must have a "type" property', '<unknown>');
    }

    const handler = this.handlers.get(type);
    if (!handler) {
      throw new CommandBusError(`No handler registered for command: ${type}`, type);
    }

    await handler.handle(command);
  }

  /**
   * Send a command and return the resulting domain events.
   */
  async sendAndReturn(command: any): Promise<EventInterface[]> {
    const type: string = command?.type ?? command?.constructor?.name;
    if (!type) {
      throw new CommandBusError('Command must have a "type" property', '<unknown>');
    }

    const handler = this.handlers.get(type);
    if (!handler) {
      throw new CommandBusError(`No handler registered for command: ${type}`, type);
    }

    return handler.handle(command);
  }

  getHandlers(): Map<string, CommandHandlerInterface> {
    return new Map(this.handlers);
  }
}
