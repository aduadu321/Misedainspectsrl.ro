import { Request, Response, NextFunction } from "express";

export interface CustomError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Ceva nu a mers bine pe server";

  // Mongoose validation error
  if (error.name === "ValidationError") {
    statusCode = 400;
    const mongooseError = error as unknown as {
      errors: Record<string, { message: string }>;
    };
    message = Object.values(mongooseError.errors)
      .map((val) => val.message)
      .join(", ");
  }

  // Mongoose duplicate key error
  if ((error as unknown as { code?: number }).code === 11000) {
    statusCode = 400;
    const duplicateError = error as unknown as {
      keyValue?: Record<string, unknown>;
    };
    const field = Object.keys(duplicateError.keyValue || {})[0];
    message = `${
      field === "email" ? "Email-ul" : "Numărul de telefon"
    } este deja înregistrat`;
  }

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Token invalid";
  }

  if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expirat";
  }

  console.error("Error:", {
    message: error.message,
    stack: error.stack,
    statusCode,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};

export const asyncHandler =
  (
    fn: (
      req: Request,
      res: Response,
      next: NextFunction
    ) => Promise<unknown> | unknown
  ) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };