import { createMealEntry, type FoodItem, type MealEntry, type MealMood, type MealType } from "../../domain/meal-entry";
import type { MealEntryRepository } from "../ports/meal-entry-repository";

export type RecordMealCommand = {
  userId: string;
  mealType: MealType;
  eatenAt: string;
  items: FoodItem[];
  note?: string;
  tags?: string[];
  mood?: MealMood;
};

export class RecordMealUseCase {
  constructor(private readonly mealEntries: MealEntryRepository) {}

  async execute(command: RecordMealCommand): Promise<MealEntry> {
    const entry = createMealEntry(command);
    return this.mealEntries.save(entry);
  }
}
