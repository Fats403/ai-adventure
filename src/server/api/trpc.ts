/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { adminAuth } from "@/server/db/firebase-admin";
import type { DecodedIdToken } from "firebase-admin/auth";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */

interface CreateContextOptions {
  headers: Headers;
  user: DecodedIdToken | null;
}

const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    headers: opts.headers,
    user: opts.user,
  };
};

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const authHeader = opts.headers.get("Authorization");
  let user: DecodedIdToken | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const idToken = authHeader.split("Bearer ")[1];
    if (idToken) {
      try {
        user = await adminAuth.verifyIdToken(idToken);
        console.log(`[TRPC Context] Verified token for user: ${user.uid}`);
      } catch (error) {
        console.warn(
          `[TRPC Context] Token verification failed:`,
          error instanceof Error ? error.message : error,
        );
        user = null;
      }
    }
  } else {
    console.log(
      "[TRPC Context] No Authorization header found or not Bearer token.",
    );
  }

  return createInnerTRPCContext({
    headers: opts.headers,
    user,
  });
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path, ctx }) => {
  const start = Date.now();

  const result = await next({
    ctx: {
      ...ctx,
    },
  });

  const end = Date.now();
  const userIndicator = ctx.user
    ? `(User: ${ctx.user.uid})`
    : "(Unauthenticated)";
  console.log(`[TRPC] ${path} ${userIndicator} took ${end - start}ms`);

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in (`ctx.user` will be populated if a valid token was sent).
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * Middleware to enforce authentication. If the user is not authenticated, it throws an error.
 * It assumes the `createTRPCContext` function attempts to populate `ctx.user`.
 */
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.user.uid) {
    console.warn("[TRPC Auth] Unauthorized attempt blocked.");
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Use this procedure for API endpoints that require a logged-in user.
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(enforceUserIsAuthed);
