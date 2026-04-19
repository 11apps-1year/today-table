import type { ListMealEntriesQuery, MealEntry, MealEntryRepository, MealMood, MealType } from "@today-table/core";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

type MealEntryRow = {
  id: string;
  user_id: string;
  meal_type: MealType;
  eaten_at: string;
  items_json: string;
  note: string | null;
  tags_json: string;
  mood: MealMood;
  created_at: string;
  updated_at: string;
};

export class SQLiteMealEntryRepository implements MealEntryRepository {
  private database?: DatabaseSync;

  constructor(private readonly databasePath = process.env.SQLITE_DATABASE_PATH ?? "data/today-table.local.db") {}

  async save(entry: MealEntry): Promise<MealEntry> {
    const database = this.getDatabase();

    database
      .prepare(
        `insert into meal_entries (
          id,
          user_id,
          meal_type,
          eaten_at,
          items_json,
          note,
          tags_json,
          mood,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          user_id = excluded.user_id,
          meal_type = excluded.meal_type,
          eaten_at = excluded.eaten_at,
          items_json = excluded.items_json,
          note = excluded.note,
          tags_json = excluded.tags_json,
          mood = excluded.mood,
          updated_at = excluded.updated_at`
      )
      .run(
        entry.id,
        entry.userId,
        entry.mealType,
        entry.eatenAt,
        JSON.stringify(entry.items),
        entry.note ?? null,
        JSON.stringify(entry.tags),
        entry.mood,
        entry.createdAt,
        entry.updatedAt
      );

    return entry;
  }

  async listByUser(query: ListMealEntriesQuery): Promise<MealEntry[]> {
    const rows = this.getDatabase()
      .prepare(
        `select
          id,
          user_id,
          meal_type,
          eaten_at,
          items_json,
          note,
          tags_json,
          mood,
          created_at,
          updated_at
        from meal_entries
        where user_id = ?
        order by eaten_at desc, created_at desc
        limit ?`
      )
      .all(query.userId, query.limit ?? 30) as MealEntryRow[];

    return rows.map(rowToMealEntry);
  }

  private getDatabase(): DatabaseSync {
    if (this.database) {
      return this.database;
    }

    const absolutePath = isAbsolute(this.databasePath)
      ? this.databasePath
      : join(/*turbopackIgnore: true*/ process.cwd(), this.databasePath);
    mkdirSync(dirname(absolutePath), { recursive: true });

    const database = new DatabaseSync(absolutePath);
    database.exec(`
      create table if not exists meal_entries (
        id text primary key,
        user_id text not null,
        meal_type text not null,
        eaten_at text not null,
        items_json text not null,
        note text,
        tags_json text not null,
        mood text not null,
        created_at text not null,
        updated_at text not null
      );

      create index if not exists idx_meal_entries_user_eaten_at
        on meal_entries (user_id, eaten_at desc);
    `);

    this.database = database;
    return database;
  }
}

function rowToMealEntry(row: MealEntryRow): MealEntry {
  return {
    id: row.id,
    userId: row.user_id,
    mealType: row.meal_type,
    eatenAt: row.eaten_at,
    items: JSON.parse(row.items_json) as MealEntry["items"],
    note: row.note ?? undefined,
    tags: JSON.parse(row.tags_json) as string[],
    mood: row.mood,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
