import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";

type ServiceAccountJson = {
  project_id: string;
  client_email: string;
  private_key: string;
};

export function getFirebaseAdminApp(): App {
  const existing = getApps()[0];

  if (existing) {
    return existing;
  }

  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (serviceAccountBase64) {
    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountBase64, "base64").toString("utf8")
    ) as ServiceAccountJson;

    return initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key.replace(/\\n/g, "\n")
      }),
      storageBucket
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    storageBucket
  });
}
