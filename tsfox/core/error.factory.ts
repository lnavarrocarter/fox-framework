
import { Request, Response, NextFunction } from "express";
import { ErrorHandler, HttpError } from "./types";

export const errorHandler: ErrorHandler = (err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
    } else {
        console.error('Internal Server Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export { HttpError };
