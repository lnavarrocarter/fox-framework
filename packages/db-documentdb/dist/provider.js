"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentDbProvider = void 0;
const db_mongo_1 = require("@foxframework/db-mongo");
const connection_builder_1 = require("./connection-builder");
const collection_initializer_1 = require("./collection-initializer");
class DocumentDbProvider {
    constructor(config) {
        this.config = config;
        this.inner = null;
        this._isConnected = false;
    }
    async connect() {
        const uri = (0, connection_builder_1.buildDocumentDbUri)(this.config);
        this.inner = new db_mongo_1.MongoProvider(uri, this.config.database);
        await this.inner.connect();
        this._isConnected = true;
        // Auto-create collections
        if (this.config.entities?.length) {
            const initializer = new collection_initializer_1.CollectionInitializer(() => this.inner.db);
            await initializer.ensureCollections(this.config.entities);
        }
    }
    async disconnect() {
        await this.inner?.disconnect();
        this._isConnected = false;
    }
    collection(name) {
        if (!this.inner) {
            throw new Error('DocumentDbProvider is not connected. Call connect() first.');
        }
        return this.inner.collection(name);
    }
    get isConnected() {
        return this._isConnected;
    }
}
exports.DocumentDbProvider = DocumentDbProvider;
//# sourceMappingURL=provider.js.map