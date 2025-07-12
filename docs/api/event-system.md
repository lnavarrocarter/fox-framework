# 🎯 Event System - Fox Framework

## 📋 Índice

- [Introducción](#introducción)
- [Conceptos Clave](#conceptos-clave)
- [Arquitectura](#arquitectura)
- [Configuración](#configuración)
- [Event Sourcing](#event-sourcing)
- [CQRS](#cqrs)
- [Pub/Sub Distribuido](#pubsub-distribuido)
- [Ejemplos Prácticos](#ejemplos-prácticos)
- [Mejores Prácticas](#mejores-prácticas)

## 🎯 Introducción

El Event System de Fox Framework es una implementación completa de patrones de Event Sourcing, CQRS (Command Query Responsibility Segregation) y Pub/Sub distribuido. Está diseñado para aplicaciones escalables que requieren procesamiento de eventos, auditoría completa y arquitecturas distribuidas.

### Características Principales

- **Event Sourcing**: Almacena todos los cambios como eventos
- **CQRS**: Separación entre comandos y consultas
- **Event Store**: Persistencia de eventos con transacciones
- **Event Bus**: Distribución de eventos entre servicios
- **Event Replay**: Reconstrucción de estado desde eventos
- **Projections**: Vistas materializadas desde eventos
- **Sagas**: Procesos de larga duración

## 🏗️ Conceptos Clave

### Event (Evento)

Un evento representa algo que ha ocurrido en el pasado y no puede ser cambiado.

```typescript
interface EventInterface {
  id: string;              // Identificador único del evento
  type: string;            // Tipo de evento (ej: 'user.created')
  aggregateId?: string;    // ID del agregado relacionado
  version?: number;        // Versión del evento en el stream
  data: any;              // Datos del evento
  metadata?: EventMetadata; // Metadatos adicionales
  timestamp?: Date;        // Timestamp del evento
}
```

### Event Stream

Una secuencia ordenada de eventos relacionados con una entidad específica.

```typescript
// Stream: user_123
[
  { type: 'user.registered', version: 1, data: { name: 'John' } },
  { type: 'user.email_verified', version: 2, data: { email: 'john@...' } },
  { type: 'user.profile_updated', version: 3, data: { phone: '+123...' } }
]
```

### Event Handler

Función que procesa eventos cuando ocurren.

```typescript
type EventHandler = (event: EventInterface) => Promise<void> | void;

const userCreatedHandler: EventHandler = async (event) => {
  console.log(`User created: ${event.data.name}`);
  // Enviar email de bienvenida
  // Actualizar proyecciones
  // Disparar otros procesos
};
```

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Event Store   │    │  Event Emitter  │    │   Event Bus     │
│                 │    │                 │    │                 │
│ • Persistencia  │◄───┤ • Local Events  │◄───┤ • Distributed   │
│ • Transactions  │    │ • Subscriptions │    │ • External Msg  │
│ • Replay        │    │ • Middleware    │    │ • Adapters      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Event System   │
                    │                 │
                    │ • Orchestration │
                    │ • Configuration │
                    │ • Statistics    │
                    └─────────────────┘
```

## ⚙️ Configuración

### Configuración Básica

```typescript
import { EventSystemFactory } from 'fox-framework';

// Sistema en memoria (desarrollo/testing)
const eventSystem = EventSystemFactory.createMemorySystem();
```

### Configuración Avanzada

```typescript
const eventSystem = EventSystemFactory.createFromConfig({
  store: {
    type: 'memory',
    // Para PostgreSQL Event Store:
    // type: 'postgresql',
    // connection: { ... }
  },
  bus: {
    adapter: 'redis',
    connection: {
      host: 'localhost',
      port: 6379,
      keyPrefix: 'events:'
    },
    partitions: 4,
    consumerGroup: {
      id: 'my-service',
      maxConcurrency: 10
    }
  },
  performance: {
    maxConcurrency: 100,
    batchSize: 50,
    bufferSize: 1000
  },
  errorHandling: {
    retryFailedMessages: true,
    maxRetries: 3,
    deadLetterQueue: true
  }
});
```

## 📝 Event Sourcing

### Definición de Eventos

```typescript
// Eventos de dominio para User
interface UserRegisteredEvent {
  type: 'user.registered';
  data: {
    name: string;
    email: string;
    registrationDate: Date;
  };
}

interface UserEmailVerifiedEvent {
  type: 'user.email_verified';
  data: {
    email: string;
    verificationDate: Date;
  };
}

interface UserProfileUpdatedEvent {
  type: 'user.profile_updated';
  data: {
    changes: Record<string, any>;
    updatedFields: string[];
  };
}
```

### Almacenamiento de Eventos

```typescript
const store = eventSystem.getStore();

// Crear eventos para un usuario
const events: EventInterface[] = [
  {
    id: 'evt_001',
    type: 'user.registered',
    aggregateId: 'user_123',
    version: 1,
    data: {
      name: 'John Doe',
      email: 'john@example.com',
      registrationDate: new Date()
    },
    metadata: {
      source: 'registration-service',
      correlationId: 'req_001',
      causationId: 'cmd_register_user'
    },
    timestamp: new Date()
  }
];

// Almacenar eventos en stream
await store.append('user_123', events);
```

### Lectura y Replay de Eventos

```typescript
// Leer todos los eventos de un usuario
const userEvents = await store.read('user_123');

// Leer desde una versión específica
const recentEvents = await store.read('user_123', 5); // desde versión 5

// Replay eventos para reconstruir estado
await eventSystem.replay('user_123');
```

### Reconstrucción de Estado

```typescript
class UserAggregate {
  private id: string;
  private name: string;
  private email: string;
  private isEmailVerified: boolean = false;
  private version: number = 0;

  static async fromHistory(streamId: string, eventStore: EventStoreInterface): Promise<UserAggregate> {
    const events = await eventStore.read(streamId);
    const user = new UserAggregate();
    
    for (const event of events) {
      user.apply(event);
    }
    
    return user;
  }

  private apply(event: EventInterface): void {
    switch (event.type) {
      case 'user.registered':
        this.id = event.aggregateId!;
        this.name = event.data.name;
        this.email = event.data.email;
        break;
        
      case 'user.email_verified':
        this.isEmailVerified = true;
        break;
        
      case 'user.profile_updated':
        Object.assign(this, event.data.changes);
        break;
    }
    
    this.version = event.version || this.version + 1;
  }

  toSnapshot() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      isEmailVerified: this.isEmailVerified,
      version: this.version
    };
  }
}
```

## 🎯 CQRS

### Command Side (Escritura)

```typescript
// Comandos representan intención de cambio
interface RegisterUserCommand {
  id: string;
  name: string;
  email: string;
}

interface VerifyUserEmailCommand {
  userId: string;
  verificationToken: string;
}

// Command Handlers
class UserCommandHandler {
  constructor(
    private eventStore: EventStoreInterface,
    private eventSystem: EventSystemInterface
  ) {}

  async handle(command: RegisterUserCommand): Promise<void> {
    // Validar comando
    if (!command.email || !command.name) {
      throw new Error('Invalid command');
    }

    // Crear evento
    const event: EventInterface = {
      id: generateId(),
      type: 'user.registered',
      aggregateId: command.id,
      version: 1,
      data: {
        name: command.name,
        email: command.email,
        registrationDate: new Date()
      },
      metadata: {
        source: 'user-command-handler',
        correlationId: generateCorrelationId()
      },
      timestamp: new Date()
    };

    // Persistir y emitir evento
    await this.eventStore.append(command.id, [event]);
    await this.eventSystem.emit(event);
  }
}
```

### Query Side (Lectura)

```typescript
// Read Models optimizadas para consultas
interface UserReadModel {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  registrationDate: Date;
  lastUpdated: Date;
}

// Projection que mantiene Read Models actualizadas
class UserProjection {
  private users: Map<string, UserReadModel> = new Map();

  constructor(eventSystem: EventSystemInterface) {
    // Suscribirse a eventos de usuario
    eventSystem.on('user.registered', this.onUserRegistered.bind(this));
    eventSystem.on('user.email_verified', this.onUserEmailVerified.bind(this));
    eventSystem.on('user.profile_updated', this.onUserProfileUpdated.bind(this));
  }

  private async onUserRegistered(event: EventInterface): Promise<void> {
    const user: UserReadModel = {
      id: event.aggregateId!,
      name: event.data.name,
      email: event.data.email,
      isEmailVerified: false,
      registrationDate: event.data.registrationDate,
      lastUpdated: new Date()
    };

    this.users.set(user.id, user);
    
    // También persistir en DB para queries complejas
    await this.saveToDatabase(user);
  }

  private async onUserEmailVerified(event: EventInterface): Promise<void> {
    const user = this.users.get(event.aggregateId!);
    if (user) {
      user.isEmailVerified = true;
      user.lastUpdated = new Date();
      await this.saveToDatabase(user);
    }
  }

  // Query methods
  async findById(id: string): Promise<UserReadModel | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<UserReadModel | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async findVerifiedUsers(): Promise<UserReadModel[]> {
    return Array.from(this.users.values())
      .filter(user => user.isEmailVerified);
  }

  private async saveToDatabase(user: UserReadModel): Promise<void> {
    // Guardar en base de datos para queries complejas
    // await db.query('UPSERT INTO user_read_models ...', user);
  }
}
```

## 📡 Pub/Sub Distribuido

### Configuración de Event Bus

```typescript
// Redis Event Bus
const eventSystem = EventSystemFactory.createFromConfig({
  bus: {
    adapter: 'redis',
    connection: {
      host: 'redis-cluster.example.com',
      port: 6379,
      password: 'secret',
      keyPrefix: 'events:',
      cluster: true
    }
  }
});

// RabbitMQ Event Bus
const eventSystem = EventSystemFactory.createFromConfig({
  bus: {
    adapter: 'rabbitmq',
    connection: {
      url: 'amqp://user:pass@rabbitmq.example.com',
      exchange: 'events',
      exchangeType: 'topic'
    }
  }
});
```

### Publicación Distribuida

```typescript
// Publicar evento a servicios externos
const bus = eventSystem.getBus();

await bus.publish({
  id: generateId(),
  type: 'order.created',
  aggregateId: 'order_456',
  data: {
    customerId: 'user_123',
    total: 99.99,
    items: [...]
  },
  metadata: {
    source: 'order-service',
    correlationId: 'req_order_123'
  },
  timestamp: new Date()
});
```

### Suscripción Distribuida

```typescript
// Suscribirse a eventos de otros servicios
const subscription = await bus.subscribe(
  'order.created',
  async (event) => {
    // Procesar pedido en servicio de inventory
    await inventoryService.reserveItems(event.data.items);
    
    // Procesar en servicio de shipping
    await shippingService.calculateShipping(event.data);
  },
  {
    durable: true,
    ackTimeout: 30000,
    maxRetries: 3,
    consumerGroup: 'inventory-service'
  }
);
```

### Patrones de Routing

```typescript
// Suscripción con patrones
await bus.subscribe('user.*', userEventHandler);          // Todos los eventos de usuario
await bus.subscribe('order.created', orderCreatedHandler); // Solo órdenes creadas
await bus.subscribe('*.failed', errorHandler);             // Todos los eventos de error

// Múltiples suscripciones
await bus.subscribeToMultiple(
  ['user.created', 'user.updated', 'user.deleted'],
  userCacheInvalidationHandler
);
```

## 🔧 Ejemplos Prácticos

### E-commerce Event Sourcing

```typescript
// Eventos de E-commerce
const events = [
  {
    id: 'evt_001',
    type: 'product.created',
    aggregateId: 'product_abc',
    data: { name: 'Laptop', price: 999.99, sku: 'LAP001' }
  },
  {
    id: 'evt_002', 
    type: 'inventory.added',
    aggregateId: 'product_abc',
    data: { quantity: 50, warehouse: 'WH001' }
  },
  {
    id: 'evt_003',
    type: 'order.created',
    aggregateId: 'order_123',
    data: { 
      customerId: 'user_456',
      items: [{ productId: 'product_abc', quantity: 1 }],
      total: 999.99
    }
  },
  {
    id: 'evt_004',
    type: 'inventory.reserved',
    aggregateId: 'product_abc',
    data: { quantity: 1, orderId: 'order_123' }
  },
  {
    id: 'evt_005',
    type: 'payment.processed',
    aggregateId: 'order_123',
    data: { amount: 999.99, method: 'credit_card' }
  },
  {
    id: 'evt_006',
    type: 'order.fulfilled',
    aggregateId: 'order_123',
    data: { shippingTrackingId: 'TRACK123' }
  }
];

// Procesar eventos
for (const event of events) {
  await eventSystem.emit(event);
}
```

### Sistema de Notificaciones

```typescript
// Servicio de notificaciones que reacciona a eventos
class NotificationService {
  constructor(eventSystem: EventSystemInterface) {
    this.setupEventHandlers(eventSystem);
  }

  private setupEventHandlers(eventSystem: EventSystemInterface): void {
    // Usuario registrado -> Email de bienvenida
    eventSystem.on('user.registered', async (event) => {
      await this.sendWelcomeEmail(event.data.email, event.data.name);
    });

    // Pedido creado -> Confirmación de pedido
    eventSystem.on('order.created', async (event) => {
      const user = await this.getUserById(event.data.customerId);
      await this.sendOrderConfirmation(user.email, event.data);
    });

    // Pedido enviado -> Notificación de envío
    eventSystem.on('order.shipped', async (event) => {
      const user = await this.getUserById(event.data.customerId);
      await this.sendShippingNotification(user.email, event.data.trackingId);
    });

    // Pagos fallidos -> Alerta
    eventSystem.on('payment.failed', async (event) => {
      await this.sendPaymentFailureAlert(event.data);
    });
  }

  private async sendWelcomeEmail(email: string, name: string): Promise<void> {
    // Implementar envío de email
  }
}
```

### Saga para Proceso de Orden

```typescript
// Saga que maneja el proceso completo de una orden
class OrderProcessingSaga {
  private activeOrders: Map<string, OrderState> = new Map();

  constructor(eventSystem: EventSystemInterface) {
    this.setupEventHandlers(eventSystem);
  }

  private setupEventHandlers(eventSystem: EventSystemInterface): void {
    eventSystem.on('order.created', this.onOrderCreated.bind(this));
    eventSystem.on('inventory.reserved', this.onInventoryReserved.bind(this));
    eventSystem.on('inventory.insufficient', this.onInventoryInsufficient.bind(this));
    eventSystem.on('payment.processed', this.onPaymentProcessed.bind(this));
    eventSystem.on('payment.failed', this.onPaymentFailed.bind(this));
    eventSystem.on('shipping.scheduled', this.onShippingScheduled.bind(this));
  }

  private async onOrderCreated(event: EventInterface): Promise<void> {
    const orderId = event.aggregateId!;
    
    // Inicializar estado de la saga
    this.activeOrders.set(orderId, {
      orderId,
      status: 'created',
      steps: ['inventory_check', 'payment', 'shipping']
    });

    // Comando: reservar inventory
    await this.sendCommand('reserve_inventory', {
      orderId,
      items: event.data.items
    });
  }

  private async onInventoryReserved(event: EventInterface): Promise<void> {
    const orderId = event.data.orderId;
    const orderState = this.activeOrders.get(orderId);

    if (orderState) {
      orderState.inventoryReserved = true;
      
      // Comando: procesar pago
      await this.sendCommand('process_payment', {
        orderId,
        amount: orderState.total
      });
    }
  }

  private async onPaymentProcessed(event: EventInterface): Promise<void> {
    const orderId = event.aggregateId!;
    const orderState = this.activeOrders.get(orderId);

    if (orderState && orderState.inventoryReserved) {
      // Comando: programar envío
      await this.sendCommand('schedule_shipping', {
        orderId,
        address: orderState.shippingAddress
      });
    }
  }

  private async onPaymentFailed(event: EventInterface): Promise<void> {
    const orderId = event.aggregateId!;
    
    // Compensación: liberar inventory
    await this.sendCommand('release_inventory', { orderId });
    
    // Marcar saga como fallida
    this.activeOrders.delete(orderId);
  }

  private async sendCommand(commandType: string, data: any): Promise<void> {
    // Enviar comando a través del command bus
    // await commandBus.send({ type: commandType, data });
  }
}
```

## ✅ Mejores Prácticas

### Diseño de Eventos

1. **Eventos como hechos pasados**: Use tiempo pasado (`UserRegistered`, no `RegisterUser`)
2. **Eventos inmutables**: Los eventos nunca cambian una vez emitidos
3. **Versionado de eventos**: Incluya versión para evolución del schema
4. **Metadatos ricos**: Correlación, causación, source, timestamp

```typescript
// ✅ Bueno
const event = {
  type: 'user.email_verified',  // Pasado
  version: 2,                   // Versionado
  data: { email: 'john@...' },  // Solo datos necesarios
  metadata: {
    correlationId: 'req_123',   // Trazabilidad
    causationId: 'evt_122',     // Qué causó este evento
    source: 'verification-service'
  }
};

// ❌ Malo
const event = {
  type: 'verify_email',         // Comando, no evento
  data: { user: { /* todo */ } } // Demasiados datos
};
```

### Performance

1. **Snapshots**: Para agregados con muchos eventos
2. **Proyecciones**: Para queries complejas
3. **Batching**: Procesar eventos en lotes
4. **Partitioning**: Distribuir carga por aggregate ID

```typescript
// Snapshot cada 100 eventos
class OrderAggregate {
  private version: number = 0;
  
  async save(eventStore: EventStoreInterface): Promise<void> {
    if (this.version % 100 === 0) {
      await eventStore.createSnapshot(this.id, this.version, this.toSnapshot());
    }
  }
  
  static async fromSnapshot(
    aggregateId: string, 
    eventStore: EventStoreInterface
  ): Promise<OrderAggregate> {
    const snapshot = await eventStore.getLatestSnapshot(aggregateId);
    
    if (snapshot) {
      const aggregate = OrderAggregate.fromSnapshot(snapshot.data);
      const events = await eventStore.read(aggregateId, snapshot.version + 1);
      
      for (const event of events) {
        aggregate.apply(event);
      }
      
      return aggregate;
    }
    
    return OrderAggregate.fromHistory(aggregateId, eventStore);
  }
}
```

### Error Handling

1. **Idempotencia**: Los handlers deben ser idempotentes
2. **Retry con backoff**: Para errores transitorios
3. **Dead letter queue**: Para eventos que fallan consistentemente
4. **Circuit breaker**: Para servicios externos

```typescript
// Handler idempotente
class UserProjectionHandler {
  private processedEvents = new Set<string>();

  async handle(event: EventInterface): Promise<void> {
    // Verificar si ya fue procesado
    if (this.processedEvents.has(event.id)) {
      return; // Ya procesado, skip
    }

    try {
      await this.updateProjection(event);
      this.processedEvents.add(event.id);
    } catch (error) {
      if (this.isTransientError(error)) {
        throw error; // Retry
      } else {
        await this.sendToDeadLetterQueue(event, error);
      }
    }
  }
}
```

### Testing

```typescript
// Test con eventos
describe('UserAggregate', () => {
  it('should handle user registration', async () => {
    // Given
    const aggregate = new UserAggregate();
    const command = new RegisterUserCommand('user_123', 'John', 'john@example.com');

    // When
    const events = aggregate.handle(command);

    // Then
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('user.registered');
    expect(events[0].data.name).toBe('John');
  });

  it('should rebuild from events', async () => {
    // Given
    const events = [
      { type: 'user.registered', data: { name: 'John' } },
      { type: 'user.email_verified', data: { email: 'john@...' } }
    ];

    // When
    const aggregate = UserAggregate.fromEvents(events);

    // Then
    expect(aggregate.getName()).toBe('John');
    expect(aggregate.isEmailVerified()).toBe(true);
  });
});
```

El Event System de Fox Framework proporciona una base sólida para construir aplicaciones escalables y mantenibles utilizando los patrones más modernos de arquitectura de software.
