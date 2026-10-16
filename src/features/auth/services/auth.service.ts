import "server-only";
import { createClient } from "@/server/db/client";
import { UnauthorizedError } from "@/lib/errors";

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  userMetadata: Record<string, unknown>;
}

export class AuthService {
  /**
   * Retrieves the current user from the validated Supabase session cookies.
   * Returns null if unauthenticated.
   */
  static async getCurrentUser(): Promise<AuthenticatedUser | null> {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? null,
      userMetadata: user.user_metadata || {},
    };
  }

  /**
   * Server-side authentication guard. Throws UnauthorizedError if unauthenticated.
   * NEVER rely on middleware alone for securing server actions and data mutations.
   */
  static async requireUser(): Promise<AuthenticatedUser> {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      throw new UnauthorizedError("Authentication required. Please sign in to proceed.");
    }
    return user;
  }
}
