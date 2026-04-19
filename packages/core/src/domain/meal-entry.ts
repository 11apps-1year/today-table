export type MealMood = "light" | "balanced" | "heavy" | "celebration" | "unsure";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type FoodItem = {
  name: string;
  amount?: string;
};

export type MealEntry = {
  id: string;
  userId: string;
  mealType: MealType;
  eatenAt: string;
  items: FoodItem[];
  note?: string;
  tags: string[];
  mood: MealMood;
  createdAt: string;
  updatedAt: string;
};

export type NewMealEntry = {
  userId: string;
  mealType: MealType;
  eatenAt: string;
  items: FoodItem[];
  note?: string;
  tags?: string[];
  mood?: MealMood;
};

export function createMealEntry(input: NewMealEntry, now = new Date()): MealEntry {
  const items = normalizeFoodItems(input.items);

  if (items.length === 0) {
    throw new Error("At least one food item is required.");
  }

  const timestamp = now.toISOString();

  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    mealType: input.mealType,
    eatenAt: new Date(input.eatenAt).toISOString(),
    items,
    note: normalizeOptionalText(input.note),
    tags: normalizeTags(input.tags ?? []),
    mood: input.mood ?? "unsure",
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function normalizeFoodItems(items: FoodItem[]): FoodItem[] {
  return items
    .map((item) => ({
      name: item.name.trim(),
      amount: normalizeOptionalText(item.amount)
    }))
    .filter((item) => item.name.length > 0);
}

function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function normalizeOptionalText(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
