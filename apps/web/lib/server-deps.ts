import { FirebaseAuthTokenVerifier, FirebaseStorageMealEntryRepository } from "@today-table/firebase-storage";
import { ListMealsUseCase, RecordMealUseCase } from "@today-table/core";
import { SQLiteMealEntryRepository } from "@today-table/sqlite";

export type AuthMode = "firebase" | "mock";
export type MealRepositoryMode = "firebase-storage" | "sqlite";

const mealEntries = createMealEntryRepository();

export const authMode = getAuthMode();
export const authTokenVerifier = new FirebaseAuthTokenVerifier();
export const listMealsUseCase = new ListMealsUseCase(mealEntries);
export const recordMealUseCase = new RecordMealUseCase(mealEntries);

function createMealEntryRepository() {
  const mode = getMealRepositoryMode();

  if (mode === "firebase-storage") {
    return new FirebaseStorageMealEntryRepository();
  }

  return new SQLiteMealEntryRepository();
}

function getAuthMode(): AuthMode {
  const configured = process.env.AUTH_MODE;

  if (configured === "firebase" || configured === "mock") {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? "firebase" : "mock";
}

function getMealRepositoryMode(): MealRepositoryMode {
  const configured = process.env.MEAL_REPOSITORY;

  if (configured === "firebase-storage" || configured === "sqlite") {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? "firebase-storage" : "sqlite";
}
