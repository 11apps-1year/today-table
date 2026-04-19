import type { ListMealEntriesQuery, MealEntry, MealEntryRepository } from "@today-table/core";
import { getStorage } from "firebase-admin/storage";
import { getFirebaseAdminApp } from "./firebase-admin-app";

export class FirebaseStorageMealEntryRepository implements MealEntryRepository {
  async save(entry: MealEntry): Promise<MealEntry> {
    const file = getBucket().file(entryPath(entry.userId, entry.id));

    await file.save(JSON.stringify(entry, null, 2), {
      contentType: "application/json",
      resumable: false,
      metadata: {
        cacheControl: "private, max-age=0, no-cache"
      }
    });

    return entry;
  }

  async listByUser(query: ListMealEntriesQuery): Promise<MealEntry[]> {
    const [files] = await getBucket().getFiles({
      prefix: userPrefix(query.userId),
      maxResults: query.limit ?? 30
    });

    const entries = await Promise.all(
      files
        .filter((file) => file.name.endsWith(".json"))
        .map(async (file) => {
          const [body] = await file.download();
          return JSON.parse(body.toString("utf8")) as MealEntry;
        })
    );

    return entries
      .sort((left, right) => right.eatenAt.localeCompare(left.eatenAt))
      .slice(0, query.limit ?? 30);
  }
}

function getBucket() {
  return getStorage(getFirebaseAdminApp()).bucket();
}

function userPrefix(userId: string): string {
  return `meal-entries/${encodeURIComponent(userId)}/`;
}

function entryPath(userId: string, entryId: string): string {
  return `${userPrefix(userId)}${entryId}.json`;
}
