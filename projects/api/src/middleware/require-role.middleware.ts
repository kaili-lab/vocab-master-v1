import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { users } from "../db/schema";
import type { Bindings } from "../types/bindings";
import type { AppVariables } from "../types/variables";

export const requireRole = (allowedRoles: string[]) =>
  createMiddleware<{
    Bindings: Bindings;
    Variables: AppVariables;
  }>(async (c, next) => {
    const session = c.get("session");

    if (!session) {
      return c.json(
        {
          success: false,
          error: "Unauthorized",
        },
        401
      );
    }

    const db = c.get("db");

    const userId =
      typeof session.user.id === "string"
        ? parseInt(session.user.id, 10)
        : session.user.id;

    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return c.json(
        {
          success: false,
          error: "User not found",
        },
        404
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        {
          success: false,
          error: "Forbidden",
        },
        403
      );
    }

    await next();
  });

