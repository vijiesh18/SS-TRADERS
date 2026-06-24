import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

/**
 * Global error handler. Must be registered last in the middleware chain.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error("Unhandled error:", err);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "A record with this value already exists" });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Record not found" });
    }
    return res.status(400).json({ error: "Database request error", code: err.code });
  }

  if (err instanceof Error) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }

  return res.status(500).json({ error: "Internal server error" });
}

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}
