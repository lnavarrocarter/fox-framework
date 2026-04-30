"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoProvider = void 0;
const repository_1 = require("./repository");
class MongoProvider {
    constructor(uri, dbName) {
        this.uri = uri;
        this.dbName = dbName;
        this.client = null;
        this.db = null;
        this._isConnected = false;
    }
    async connect() {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { MongoClient: MC } = require('mongodb');
        this.client = new MC(this.uri);
        await this.client.connect();
        this.db = this.client.db(this.dbName);
        this._isConnected = true;
    }
    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
        }
        this._isConnected = false;
    }
    collection(name) {
        if (!this.db) {
            throw new Error('MongoProvider is not connected. Call connect() first.');
        }
        return new repository_1.MongoRepository(() => this.db.collection(name));
    }
    get isConnected() {
        return this._isConnected;
    }
}
exports.MongoProvider = MongoProvider;
//# sourceMappingURL=provider.js.map