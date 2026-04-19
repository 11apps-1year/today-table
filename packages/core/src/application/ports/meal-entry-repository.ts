import type { MealEntry } from "../../domain/meal-entry";

export type ListMealEntriesQuery = {
  userId: string;
  limit?: number;
};

export interface MealEntryRepository {
  save(entry: MealEntry): Promise<MealEntry>;
  listByUser(query: ListMealEntriesQuery): Promise<MealEntry[]>;
}
