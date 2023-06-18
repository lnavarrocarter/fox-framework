import { RequestMethod } from "./methods.enums";

export enum RequestType {
    JSON = 0,
    FORM_DATA,
    URL_ENCODED,
    TEXT,
    BLOB,
    ARRAY_BUFFER,
    STREAM,
    UNKNOWN
}

export interface RequestMethodsContext { 
    method: RequestMethod, 
    path: string, 
    callback: any 
}

export enum ResponseType {
    JSON = 0,
    TEXT,
    BLOB,
    ARRAY_BUFFER,
    STREAM,
    UNKNOWN
}

export enum ResponseStatus {
    SUCCESS = 0,
    ERROR,
    TIMEOUT,
    ABORTED,
    UNKNOWN
}

export enum ResponseError {
    TIMEOUT = 0,
    ABORTED,
    UNKNOWN
}

export enum ResponseErrorType {
    TIMEOUT = 0,
    ABORTED,
    UNKNOWN
}