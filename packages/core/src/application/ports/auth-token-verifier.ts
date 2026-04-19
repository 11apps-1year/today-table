export type AuthenticatedUser = {
  id: string;
  email?: string;
  displayName?: string;
};

export interface AuthTokenVerifier {
  verifyIdToken(idToken: string): Promise<AuthenticatedUser>;
}
