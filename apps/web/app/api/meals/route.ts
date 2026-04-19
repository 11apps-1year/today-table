import type { FoodItem, MealMood, MealType } from "@today-table/core";
import { NextRequest, NextResponse } from "next/server";
import { authMode, authTokenVerifier, listMealsUseCase, recordMealUseCase } from "@/lib/server-deps";

export const runtime = "nodejs";

const moods: MealMood[] = ["light", "balanced", "heavy", "celebration", "unsure"];
const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export async function GET(request: NextRequest) {
  const user = await authenticate(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 30);
  const meals = await listMealsUseCase.execute({ userId: user.id, limit });

  return NextResponse.json({ meals });
}

export async function POST(request: NextRequest) {
  const user = await authenticate(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<{
    eatenAt: string;
    mealType: MealType;
    items: FoodItem[];
    note: string;
    tags: string[];
    mood: MealMood;
  }>;

  if (!body.eatenAt || !body.mealType || !mealTypes.includes(body.mealType) || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "Invalid meal entry payload" }, { status: 400 });
  }

  const meal = await recordMealUseCase.execute({
    userId: user.id,
    mealType: body.mealType,
    eatenAt: body.eatenAt,
    items: body.items,
    note: body.note,
    tags: Array.isArray(body.tags) ? body.tags : [],
    mood: body.mood && moods.includes(body.mood) ? body.mood : "unsure"
  });

  return NextResponse.json({ meal }, { status: 201 });
}

async function authenticate(request: NextRequest) {
  if (authMode === "mock") {
    const username = request.headers.get("x-mock-username")?.trim();

    if (!username) {
      return null;
    }

    return {
      id: username,
      displayName: username
    };
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return null;
  }

  try {
    return await authTokenVerifier.verifyIdToken(token);
  } catch {
    return null;
  }
}
