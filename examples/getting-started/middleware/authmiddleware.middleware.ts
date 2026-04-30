import { Request, Response, NextFunction } from 'express';

export interface AuthMiddlewareConfig { enabled?: boolean; }

export class AuthMiddlewareMiddleware {
  private config: AuthMiddlewareConfig;
  constructor(config: AuthMiddlewareConfig = {}) { this.config = { enabled: true, ...config }; }
  handle = async (_req: Request, _res: Response, next: NextFunction): Promise<void> => { if (!this.config.enabled) return next(); return next(); };
  updateConfig(cfg: Partial<AuthMiddlewareConfig>) { this.config = { ...this.config, ...cfg }; }
  getConfig(): AuthMiddlewareConfig { return { ...this.config }; }
}

export const createAuthMiddlewareMiddleware = (config?: AuthMiddlewareConfig) => { const m = new AuthMiddlewareMiddleware(config); return m.handle; };

export default AuthMiddlewareMiddleware;
