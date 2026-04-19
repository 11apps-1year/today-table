import type { AuthenticatedUser, AuthTokenVerifier } from "@today-table/core";
import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdminApp } from "./firebase-admin-app";

export class FirebaseAuthTokenVerifier implements AuthTokenVerifier {
  async verifyIdToken(idToken: string): Promise<AuthenticatedUser> {
    const token = await getAuth(getFirebaseAdminApp()).verifyIdToken(idToken);

    return {
      id: token.uid,
      email: token.email,
      displayName: typeof token.name === "string" ? token.name : undefined
    };
  }
}
