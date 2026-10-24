import type { SQLiteDatabase } from "expo-sqlite";
import type { Breed, BreedGroup } from "@/types/dogApi";
import { getDatabase } from "./database";

export interface SyncMetadata {
  lastSyncedAt: string | null;
  syncStatus: "idle" | "syncing" | "success" | "partial" | "error";
  lastError: string | null;
}

function parseJson<T>(json: string, context: string): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error(`SQLite JSON parse failed (${context}):`, error);
    throw new Error(`Saved ${context} data is invalid. Please refresh the catalog.`);
  }
}

export async function readBreeds(): Promise<Breed[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{ attributes_json: string }>(
    "SELECT attributes_json FROM breeds ORDER BY name COLLATE NOCASE",
  );

  return rows.map((row) => parseJson<Breed>(row.attributes_json, "breed"));
}

export async function readGroups(): Promise<BreedGroup[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{ attributes_json: string }>(
    "SELECT attributes_json FROM groups ORDER BY name COLLATE NOCASE",
  );

  return rows.map((row) =>
    parseJson<BreedGroup>(row.attributes_json, "group"),
  );
}

export async function upsertBreeds(breeds: Breed[]): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const breed of breeds) {
      await db.runAsync(
        `INSERT INTO breeds (
          id,
          name,
          group_id,
          attributes_json,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          group_id = excluded.group_id,
          attributes_json = excluded.attributes_json,
          updated_at = excluded.updated_at`,
        breed.id,
        breed.attributes.name,
        breed.relationships?.group?.data?.id ?? null,
        JSON.stringify(breed),
        now,
      );
    }
  });

  console.log("BREEDS SAVED TO SQLITE:", breeds.length);
}

export async function upsertGroups(groups: BreedGroup[]): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const group of groups) {
      await db.runAsync(
        `INSERT INTO groups (
          id,
          name,
          attributes_json,
          updated_at
        )
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          attributes_json = excluded.attributes_json,
          updated_at = excluded.updated_at`,
        group.id,
        group.attributes.name,
        JSON.stringify(group),
        now,
      );
    }
  });

  console.log("GROUPS SAVED TO SQLITE:", groups.length);
}

export async function getSyncMetadata(): Promise<SyncMetadata> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{ key: string; value: string }>(
    `SELECT key, value
     FROM sync_metadata
     WHERE key IN ('lastSyncedAt', 'syncStatus', 'lastError')`,
  );

  const values = new Map(rows.map((row) => [row.key, row.value]));
  const status = values.get("syncStatus");

  const validStatus: SyncMetadata["syncStatus"] =
    status === "syncing" ||
    status === "success" ||
    status === "partial" ||
    status === "error"
      ? status
      : "idle";

  return {
    lastSyncedAt: values.get("lastSyncedAt") ?? null,
    syncStatus: validStatus,
    lastError: values.get("lastError") ?? null,
  };
}

export async function writeSyncMetadata(
  metadata: Partial<SyncMetadata>,
): Promise<void> {
  const db = await getDatabase();

  const entries: [keyof SyncMetadata, string | null | undefined][] = [
    ["lastSyncedAt", metadata.lastSyncedAt],
    ["syncStatus", metadata.syncStatus],
    ["lastError", metadata.lastError],
  ];

  await db.withTransactionAsync(async () => {
    for (const [key, value] of entries) {
      // Undefined means "leave unchanged"; null means "clear this value".
      if (value === undefined) continue;

      if (value === null) {
        await db.runAsync("DELETE FROM sync_metadata WHERE key = ?", key);
      } else {
        await db.runAsync(
          `INSERT INTO sync_metadata (key, value)
           VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          key,
          value,
        );
      }
    }
  });
}
