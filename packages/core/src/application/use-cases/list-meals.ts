import type { MealEntry } from "../../domain/meal-entry";
import type { MealEntryRepository } from "../ports/meal-entry-repository";

export type ListMealsQuery = {
  userId: string;
  limit?: number;
};

export class ListMealsUseCase {
  constructor(private readonly mealEntries: MealEntryRepository) {}

  async execute(query: ListMealsQuery): Promise<MealEntry[]> {
    return this.mealEntries.listByUser({
      userId: query.userId,
      limit: query.limit ?? 30
    });
  }
}
