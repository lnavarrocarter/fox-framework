

export enum ServerTypeCtx{
    JSON = 0,
    XML,
    HTML,
    TEXT,
    EVENT_STREAM,
}

export enum ConfigServer{
    PORT = 3000,
    ENV = 'development',
    API = '/api',
    TYPE = ServerTypeCtx.JSON,
    VIEWS = './src/views',
}