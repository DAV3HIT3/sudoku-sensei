import { headers } from "next/headers";
import { getDb } from "@/db";
import { users } from "@/db/schema";

/**
 * The player, from the identity headers `tailscale serve` adds to every request
 * from a tailnet user. The tailnet is the access control: the app is reachable
 * only through its sidecar, which overwrites these headers, so they can be trusted.
 * In development DEV_USER_LOGIN stands in for them.
 */
export async function currentUser() {
  const h = await headers();
  const login = h.get("tailscale-user-login") ?? process.env.DEV_USER_LOGIN;
  if (!login) return null;
  const name = h.get("tailscale-user-name") || login.split("@")[0];
  const [user] = await getDb()
    .insert(users)
    .values({ tsLogin: login, displayName: name })
    .onConflictDoUpdate({ target: users.tsLogin, set: { displayName: name } })
    .returning();
  return user;
}
