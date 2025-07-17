import { views } from "./views";
import { routes } from "./routes";
import { config } from "./config";
import { FoxFactory } from "./../../tsfox/core/fox.factory";
import { performanceMiddleware } from '../../tsfox/core/performance/middleware/metrics.middleware';
import appRoutes from '../routes';

// Create Fox Framework instance
const foxApp = FoxFactory.createInstance(config);

// Add performance monitoring middleware
foxApp.use(performanceMiddleware({
  trackRequests: true,
  trackResponseTime: true,
  trackMemory: true,
  slowRequestThreshold: 1000,
  excludePaths: ['/health', '/metrics']
}));

// Register routes
foxApp.use(appRoutes);

// Start the server
foxApp.start();

console.log('Fox Framework server started with monitoring');

export { foxApp };