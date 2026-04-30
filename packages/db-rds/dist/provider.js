"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RdsProvider = void 0;
const fs = __importStar(require("fs"));
const schema_builder_1 = require("./schema-builder");
class RdsProvider {
    constructor(config) {
        this.config = config;
        this.inner = null;
        this.schema = null;
        this._isConnected = false;
    }
    async connect() {
        const { config } = this;
        const isPostgres = config.engine === 'postgres' || config.engine === 'aurora-postgres';
        if (isPostgres) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { PostgresProvider } = require('@foxframework/db-postgres');
            this.inner = new PostgresProvider({
                host: config.host,
                port: config.port ?? 5432,
                database: config.database,
                user: config.user,
                password: config.password,
                ssl: this.buildSslConfig('postgres'),
                pool: config.pool,
            });
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { MySQLProvider } = require('@foxframework/db-mysql');
            this.inner = new MySQLProvider({
                host: config.host,
                port: config.port ?? 3306,
                database: config.database,
                user: config.user,
                password: config.password,
                ssl: this.buildSslConfig('mysql'),
                pool: config.pool,
            });
        }
        await this.inner.connect();
        this._isConnected = true;
        if (config.entities?.length) {
            this.schema = new schema_builder_1.SchemaBuilder(config.engine, async (sql) => {
                await this.inner.raw(sql);
            });
            await this.schema.ensureEntities(config.entities);
        }
    }
    buildSslConfig(driver) {
        const { ssl } = this.config;
        if (!ssl)
            return undefined;
        if (ssl === true) {
            return driver === 'postgres'
                ? { rejectUnauthorized: true }
                : { rejectUnauthorized: false };
        }
        // ssl is an object with ca path
        const ca = fs.readFileSync(ssl.ca);
        return { ca };
    }
    async disconnect() {
        await this.inner?.disconnect();
        this._isConnected = false;
    }
    async raw(sql, params) {
        if (!this.inner) {
            throw new Error('RdsProvider: not connected');
        }
        return this.inner.raw(sql, params);
    }
    repository(table) {
        if (!this.inner) {
            throw new Error('RdsProvider: not connected');
        }
        return this.inner.repository(table);
    }
    queryBuilder() {
        if (!this.inner) {
            throw new Error('RdsProvider: not connected');
        }
        return this.inner.queryBuilder();
    }
    get isConnected() {
        return this._isConnected;
    }
}
exports.RdsProvider = RdsProvider;
//# sourceMappingURL=provider.js.map