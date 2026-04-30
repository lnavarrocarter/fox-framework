"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoProvider = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const table_initializer_1 = require("./table-initializer");
const repository_1 = require("./repository");
class DynamoProvider {
    constructor(config) {
        this.config = config;
        this.dynamoClient = null;
        this.docClient = null;
        this._isConnected = false;
    }
    async connect() {
        const clientConfig = { region: this.config.region };
        if (this.config.endpoint)
            clientConfig.endpoint = this.config.endpoint;
        if (this.config.accessKeyId && this.config.secretAccessKey) {
            clientConfig.credentials = {
                accessKeyId: this.config.accessKeyId,
                secretAccessKey: this.config.secretAccessKey,
                ...(this.config.sessionToken ? { sessionToken: this.config.sessionToken } : {}),
            };
        }
        this.dynamoClient = new client_dynamodb_1.DynamoDBClient(clientConfig);
        this.docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(this.dynamoClient, {
            marshallOptions: { removeUndefinedValues: true },
        });
        if (this.config.entities?.length) {
            const initializer = new table_initializer_1.TableInitializer(this.dynamoClient);
            await initializer.ensureTables(this.config.entities);
        }
        this._isConnected = true;
    }
    async disconnect() {
        this.dynamoClient?.destroy();
        this.dynamoClient = null;
        this.docClient = null;
        this._isConnected = false;
    }
    table(tableName) {
        if (!this.docClient) {
            throw new Error('DynamoProvider is not connected. Call connect() first.');
        }
        return new repository_1.DynamoRepository(tableName, this.docClient);
    }
    get isConnected() {
        return this._isConnected;
    }
}
exports.DynamoProvider = DynamoProvider;
//# sourceMappingURL=provider.js.map