import NetInfo from "@react-native-community/netinfo";

import { fetchAllBreeds, fetchGroups } from "./dogApi";
import {
  getSyncMetadata,
  upsertBreeds,
  upsertGroups,
  writeSyncMetadata,
} from "@/db/breedRepository";

let syncInFlight: Promise<void> | null = null;

export function syncCatalog(): Promise<void> {
  if (syncInFlight) {
    console.log("Catalog sync already running; reusing existing request.");
    return syncInFlight;
  }

  syncInFlight = runSync().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}

async function runSync(): Promise<void> {
  try {
    const network = await NetInfo.fetch();

    if (
      !network.isConnected ||
      network.isInternetReachable === false
    ) {
      throw new Error("You are offline. Showing saved breeds.");
    }

    await writeSyncMetadata({
      syncStatus: "syncing",
      lastError: null,
    });

    console.log("Fetching breeds and groups...");

    // Fetch each resource only once.
    const [breeds, groups] = await Promise.all([
      fetchAllBreeds(),
      fetchGroups(),
    ]);

    console.log("Fetched breeds:", breeds.length);
    console.log("Fetched groups:", groups.length);

    if (breeds.length === 0) {
      throw new Error("The API returned an empty breed catalog.");
    }

    // Save data only after both API requests succeed.
    await upsertBreeds(breeds);
    await upsertGroups(groups);

    await writeSyncMetadata({
      syncStatus: "success",
      lastSyncedAt: new Date().toISOString(),
      lastError: null,
    });

    console.log("CATALOG SYNC SUCCESS");
  } catch (error: unknown) {
    console.error("CATALOG SYNC ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Catalog sync failed.";

    try {
      const previous = await getSyncMetadata();

      await writeSyncMetadata({
        syncStatus: previous.lastSyncedAt ? "partial" : "error",
        lastError: message,
      });
    } catch (metadataError) {
      console.error(
        "Could not update sync error metadata:",
        metadataError,
      );
    }

    throw error;
  }
}
