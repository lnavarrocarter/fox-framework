
import { Request, Response, NextFunction } from "express";
import { Middleware } from "./types";

class HttpError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'HttpError';
    }
}

interface HttpError extends Error {
    status: number;
}

export const errorHandler: Middleware = (err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
        res.status(err.status).send({ error: err.message });
    } else {
        res.status(500).send({ error: 'Internal Server Error' });
    }
};
