import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/db";
import { identities, users } from "@/db/schema";

export type User = typeof users.$inferSelect;

/**
 * Who is playing, or null. The one place the app learns identity: pages and
 * actions call this and use user.id, never a login or header. A public
 * deployment adds its sign-in here (a session cookie resolving to a user id) and
 * nothing else changes.
 */
export async function currentUser(): Promise<User | null> {
  const h = await headers();
  // Only behind the sidecar: `tailscale serve` sets this header on every request,
  // so it can be trusted there. On any other deployment it is just a header a
  // client can send, so it is off unless the deployment says otherwise.
  const login =
    process.env.TRUST_TAILSCALE_HEADERS === "true"
      ? h.get("tailscale-user-login")
      : process.env.NODE_ENV === "development"
        ? process.env.DEV_USER_LOGIN
        : null;
  if (!login) return null;
  const name = h.get("tailscale-user-name") || login.split("@")[0];
  return userFor("tailscale", login, name);
}

/** The user behind an identity, created with it the first time it is seen. */
async function userFor(provider: string, subject: string, displayName: string): Promise<User> {
  return getDb().transaction(async (tx) => {
    // Two first requests at once would each create a user; one waits here instead.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${provider + ":" + subject}))`);
    const [found] = await tx
      .select({ user: users })
      .from(identities)
      .innerJoin(users, eq(users.id, identities.userId))
      .where(and(eq(identities.provider, provider), eq(identities.subject, subject)));
    if (found) return found.user;
    const [user] = await tx.insert(users).values({ displayName }).returning();
    await tx.insert(identities).values({ provider, subject, userId: user.id });
    return user;
  });
}

/** The ways this user signs in, oldest first. */
export const identitiesOf = (userId: number) =>
  getDb()
    .select({ provider: identities.provider, subject: identities.subject, createdAt: identities.createdAt })
    .from(identities)
    .where(eq(identities.userId, userId))
    .orderBy(identities.createdAt);
