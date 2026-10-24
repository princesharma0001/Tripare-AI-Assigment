// import { useCallback, useEffect, useMemo, useState } from "react";
// import {
//   ActivityIndicator,
//   FlatList,
//   Pressable,
//   RefreshControl,
//   StyleSheet,
//   Text,
//   TextInput,
//   View,
//   useColorScheme,
// } from "react-native";
// import { Image } from "expo-image";
// import NetInfo from "@react-native-community/netinfo";
// import { useRouter } from "expo-router";
// import { useQuery, useQueryClient } from "@tanstack/react-query";

// import { initializeDatabase } from "@/db/database";
// import { readBreeds, getSyncMetadata } from "@/db/breedRepository";
// import { syncCatalog } from "@/services/syncService";
// import { useExplorerStore } from "@/store/explorerStore";
// import { filterBreeds } from "@/utils/filterBreeds";
// import type { Breed } from "@/types/dogApi";

// function useDebouncedValue<T>(value: T, delayMs: number): T {
//   const [debounced, setDebounced] = useState(value);

//   useEffect(() => {
//     const timer = setTimeout(() => setDebounced(value), delayMs);
//     return () => clearTimeout(timer);
//   }, [value, delayMs]);

//   return debounced;
// }

// export default function BreedListScreen() {
//   const router = useRouter();
//   const queryClient = useQueryClient();
//   const scheme = useColorScheme();
//   const dark = scheme === "dark";

//   const [isOnline, setIsOnline] = useState(true);
//   const [isSyncing, setIsSyncing] = useState(false);
//   const [isRefreshing, setIsRefreshing] = useState(false);
//   const [syncMessage, setSyncMessage] = useState<string | null>(null);

//   const query = useExplorerStore((state) => state.query);
//   const setQuery = useExplorerStore((state) => state.setQuery);
//   const filters = useExplorerStore((state) => state.filters);
//   const debouncedQuery = useDebouncedValue(query, 250);

//   const breedsQuery = useQuery({
//     queryKey: ["breeds", "local"],
//     queryFn: async () => {
//       await initializeDatabase();
//       return readBreeds();
//     },
//   });

//   const metadataQuery = useQuery({
//     queryKey: ["sync-metadata"],
//     queryFn: async () => {
//       await initializeDatabase();
//       return getSyncMetadata();
//     },
//   });

//   const breeds = breedsQuery.data ?? [];

//   const refreshLocalData = useCallback(async () => {
//     await queryClient.invalidateQueries({
//       queryKey: ["breeds", "local"],
//     });

//     await queryClient.invalidateQueries({
//       queryKey: ["sync-metadata"],
//     });
//   }, [queryClient]);

//   const runSync = useCallback(async () => {
//     if (!isOnline || isSyncing) {
//       return;
//     }

//     setIsSyncing(true);
//     setSyncMessage(null);

//     try {
//       await initializeDatabase();
//       await syncCatalog();
//       await refreshLocalData();
//     } catch (error: unknown) {
//       console.error("CATALOG SYNC FAILED:", error);

//       setSyncMessage(
//         error instanceof Error
//           ? error.message
//           : "Could not synchronize the breed catalog."
//       );

//       // Keep already saved SQLite data available.
//       await refreshLocalData();
//     } finally {
//       setIsSyncing(false);
//     }
//   }, [isOnline, isSyncing, refreshLocalData]);

//   // Track connectivity and load the local database first.
//   useEffect(() => {
//     let cancelled = false;

//     const unsubscribe = NetInfo.addEventListener((state) => {
//       const online = Boolean(
//         state.isConnected && state.isInternetReachable !== false
//       );

//       setIsOnline(online);
//     });

//     const initialize = async () => {
//       try {
//         await initializeDatabase();

//         if (cancelled) return;

//         await refreshLocalData();

//         const cachedBreeds = await readBreeds();

//         console.log("BREEDS CACHED IN SQLITE:", cachedBreeds.length);

//         if (!cancelled && cachedBreeds.length === 0) {
//           const state = await NetInfo.fetch();
//           const online = Boolean(
//             state.isConnected && state.isInternetReachable !== false
//           );

//           if (online) {
//             setIsOnline(true);

//             try {
//               setIsSyncing(true);
//               await syncCatalog();

//               if (!cancelled) {
//                 await refreshLocalData();
//                 setSyncMessage(null);
//               }
//             } catch (error: unknown) {
//               console.error("INITIAL CATALOG SYNC FAILED:", error);

//               if (!cancelled) {
//                 setSyncMessage(
//                   error instanceof Error
//                     ? error.message
//                     : "Initial catalog sync failed."
//                 );
//               }
//             } finally {
//               if (!cancelled) {
//                 setIsSyncing(false);
//               }
//             }
//           } else {
//             setIsOnline(false);
//           }
//         }
//       } catch (error: unknown) {
//         console.error("DATABASE INITIALIZATION FAILED:", error);

//         if (!cancelled) {
//           setSyncMessage(
//             error instanceof Error
//               ? error.message
//               : "Could not initialize the local database."
//           );
//         }
//       }
//     };

//     void initialize();

//     return () => {
//       cancelled = true;
//       unsubscribe();
//     };
//   }, [refreshLocalData]);

//   // Automatically sync when connectivity changes from offline to online.
//   useEffect(() => {
//     if (isOnline && breeds.length === 0 && !isSyncing) {
//       void runSync();
//     }
//   }, [isOnline, breeds.length, isSyncing, runSync]);

//   const filteredBreeds = useMemo(
//     () => filterBreeds(breeds, debouncedQuery, filters),
//     [breeds, debouncedQuery, filters]
//   );

//   const lastSyncedAt = metadataQuery.data?.lastSyncedAt;

//   const lastSyncedLabel = lastSyncedAt
//     ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}`
//     : "Not synced yet";

//   const background = dark ? "#101827" : "#F7F8FC";
//   const foreground = dark ? "#F8FAFC" : "#172033";
//   const muted = dark ? "#AAB6C8" : "#667085";

//   const handleRefresh = useCallback(async () => {
//     if (!isOnline || isSyncing) {
//       if (!isOnline) {
//         setSyncMessage("You are offline. Showing saved breeds.");
//       }
//       return;
//     }

//     setIsRefreshing(true);

//     try {
//       await runSync();
//     } finally {
//       setIsRefreshing(false);
//     }
//   }, [isOnline, isSyncing, runSync]);

//   const renderItem = useCallback(
//     ({ item }: { item: Breed }) => {
//       const imageUrl =
//         item.attributes.images?.[0]?.thumb ??
//         item.attributes.images?.[0]?.medium ??
//         item.attributes.images?.[0]?.url;

//       return (
//         <Pressable
//           accessibilityRole="button"
//           accessibilityLabel={`View ${item.attributes.name} details`}
//           onPress={() =>
//             router.push({
//               pathname: "/breed/[id]",
//               params: { id: item.id },
//             })
//           }
//           style={[
//             styles.row,
//             { backgroundColor: dark ? "#1D2939" : "#FFFFFF" },
//           ]}
//         >
//           {imageUrl ? (
//             <Image
//               source={{ uri: imageUrl }}
//               style={styles.thumbnail}
//               contentFit="cover"
//               cachePolicy="memory-disk"
//               transition={120}
//             />
//           ) : (
//             <View style={[styles.thumbnail, styles.imagePlaceholder]}>
//               <Text style={{ color: muted, fontSize: 10 }}>No image</Text>
//             </View>
//           )}

//           <View style={styles.rowText}>
//             <Text
//               style={[styles.breedName, { color: foreground }]}
//               numberOfLines={1}
//             >
//               {item.attributes.name}
//             </Text>

//             <Text
//               style={[styles.breedMeta, { color: muted }]}
//               numberOfLines={2}
//             >
//               {[
//                 item.attributes.origin?.country,
//                 item.attributes.coat?.length
//                   ? `${item.attributes.coat.length} coat`
//                   : null,
//               ]
//                 .filter(Boolean)
//                 .join(" · ") || "Breed information"}
//             </Text>
//           </View>

//           <Text style={styles.chevron}>›</Text>
//         </Pressable>
//       );
//     },
//     [dark, foreground, muted, router]
//   );



//   return (
//     <View style={[styles.container, { backgroundColor: background }]}>
//       <View style={styles.header}>
//         <Text style={styles.eyebrow}>TRIPARE AI</Text>

//         <Text style={[styles.title, { color: foreground }]}>
//           Dog Breed Explorer
//         </Text>

//         <Text style={[styles.subtitle, { color: muted }]}>
//           Find your perfect companion.
//         </Text>
//       </View>

//       <TextInput
//         value={query}
//         onChangeText={setQuery}
//         placeholder="Search breeds or other names"
//         placeholderTextColor={muted}
//         accessibilityLabel="Search breeds"
//         style={[
//           styles.search,
//           {
//             color: foreground,
//             backgroundColor: dark ? "#1D2939" : "#FFFFFF",
//             borderColor: dark ? "#344054" : "#E4E7EC",
//           },
//         ]}
//         returnKeyType="search"
//       />

//       <View style={styles.status}>
//         <View
//           style={[
//             styles.dot,
//             { backgroundColor: isOnline ? "#12B76A" : "#F79009" },
//           ]}
//         />

//         <Text style={[styles.statusText, { color: muted }]} numberOfLines={2}>
//           {isOnline ? "Online" : "Offline"} · {lastSyncedLabel}
//         </Text>

//         <Pressable
//           accessibilityRole="button"
//           accessibilityLabel="Sync breed catalog"
//           disabled={!isOnline || isSyncing}
//           onPress={() => void runSync()}
//           style={styles.syncButton}
//         >
//           {isSyncing ? (
//             <ActivityIndicator size="small" color="#F97316" />
//           ) : (
//             <Text style={[styles.refreshText, { opacity: isOnline ? 1 : 0.5 }]}>
//               Sync
//             </Text>
//           )}
//         </Pressable>
//       </View>

//       {syncMessage ? (
//         <Text accessibilityRole="alert" style={styles.banner}>
//           Sync issue: {syncMessage} Saved breeds remain available.
//         </Text>
//       ) : null}

//       {breedsQuery.isLoading && breeds.length === 0 ? (
//         <View style={styles.center}>
//           <ActivityIndicator size="large" color="#F97316" />
//           <Text style={{ color: muted, marginTop: 10 }}>
//             Loading saved breeds…
//           </Text>
//         </View>
//       ) : (
//         <>
//           <Text style={[styles.count, { color: muted }]}>
//             {filteredBreeds.length} breeds
//           </Text>

//           <FlatList
//             data={filteredBreeds}
//             keyExtractor={(item) => item.id}
//             renderItem={renderItem}
//             initialNumToRender={10}
//             maxToRenderPerBatch={10}
//             windowSize={7}
//             updateCellsBatchingPeriod={40}
//             removeClippedSubviews
//             keyboardShouldPersistTaps="handled"
//             refreshControl={
//               <RefreshControl
//                 refreshing={isRefreshing || isSyncing}
//                 onRefresh={() => void handleRefresh()}
//                 tintColor="#F97316"
//               />
//             }
//             ListEmptyComponent={
//               <View style={styles.center}>
//                 <Text style={{ color: muted, textAlign: "center" }}>
//                   {isSyncing
//                     ? "Syncing breed catalog…"
//                     : isOnline
//                     ? "No matching breeds."
//                     : "No saved breeds yet. Connect to the internet to sync the catalog."}
//                 </Text>
//               </View>
//             }
//             contentContainerStyle={[
//               styles.listContent,
//               filteredBreeds.length === 0 && styles.emptyList,
//             ]}
//           />
//         </>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     paddingTop: 56,
//   },
//   header: {
//     paddingHorizontal: 20,
//     marginBottom: 18,
//   },
//   eyebrow: {
//     color: "#F97316",
//     fontSize: 12,
//     fontWeight: "800",
//     letterSpacing: 2,
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: "800",
//     marginTop: 5,
//   },
//   subtitle: {
//     fontSize: 14,
//     marginTop: 5,
//   },
//   search: {
//     marginHorizontal: 16,
//     borderWidth: 1,
//     borderRadius: 14,
//     paddingHorizontal: 15,
//     paddingVertical: 13,
//     fontSize: 15,
//   },
//   status: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 20,
//     paddingVertical: 13,
//     gap: 7,
//   },
//   dot: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//   },
//   statusText: {
//     flex: 1,
//     fontSize: 11,
//   },
//   syncButton: {
//     minWidth: 42,
//     alignItems: "center",
//     justifyContent: "center",
//     padding: 4,
//   },
//   refreshText: {
//     color: "#F97316",
//     fontWeight: "700",
//   },
//   banner: {
//     marginHorizontal: 16,
//     marginBottom: 8,
//     backgroundColor: "#FEF3F2",
//     color: "#B42318",
//     padding: 10,
//     borderRadius: 10,
//     fontSize: 12,
//   },
//   count: {
//     paddingHorizontal: 20,
//     paddingBottom: 8,
//     fontSize: 12,
//     fontWeight: "700",
//   },
//   listContent: {
//     paddingHorizontal: 12,
//     paddingBottom: 24,
//   },
//   emptyList: {
//     flexGrow: 1,
//   },
//   row: {
//     flexDirection: "row",
//     alignItems: "center",
//     borderRadius: 14,
//     padding: 10,
//     marginBottom: 9,
//     gap: 12,
//   },
//   thumbnail: {
//     width: 64,
//     height: 64,
//     borderRadius: 10,
//     backgroundColor: "#EAECF0",
//   },
//   imagePlaceholder: {
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   rowText: {
//     flex: 1,
//     gap: 5,
//   },
//   breedName: {
//     fontSize: 15,
//     fontWeight: "700",
//   },
//   breedMeta: {
//     fontSize: 12,
//   },
//   chevron: {
//     color: "#F97316",
//     fontSize: 22,
//   },
// });


import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { Image } from 'expo-image';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { initializeDatabase } from '@/db/database';
import {
  readBreeds,
  readGroups,
  getSyncMetadata,
} from '@/db/breedRepository';
import { syncCatalog } from '@/services/syncService';
import { useExplorerStore } from '@/store/explorerStore';
import { filterBreeds } from '@/utils/filterBreeds';

import type { Breed } from '@/types/dogApi';
import type {
  SizeBand,
  CoatLength,
} from '@/store/explorerStore';

const ORANGE = '#F97316';
const NAVY = '#172554';

const SIZE_OPTIONS: { label: string; value: SizeBand }[] = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
  { label: 'Giant', value: 'giant' },
];

const COAT_OPTIONS: { label: string; value: CoatLength }[] = [
  { label: 'Short', value: 'short' },
  { label: 'Medium', value: 'medium' },
  { label: 'Long', value: 'long' },
  { label: 'Wire', value: 'wire' },
];

const TRAIT_OPTIONS = [
  { label: 'Good with children', value: 'good_with_children' },
  { label: 'Good with dogs', value: 'good_with_dogs' },
  { label: 'Good with strangers', value: 'good_with_strangers' },
] as const;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}

type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  dark: boolean;
};

function FilterChip({
  label,
  selected,
  onPress,
  dark,
}: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        {
          backgroundColor: selected
            ? ORANGE
            : dark
              ? '#202020'
              : '#FFFFFF',
          borderColor: selected
            ? ORANGE
            : dark
              ? '#404040'
              : '#E5E7EB',
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: selected ? '#FFFFFF' : dark ? '#F5F5F5' : '#262626',
            fontWeight: selected ? '700' : '500',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function BreedListScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  const query = useExplorerStore(state => state.query);
  const setQuery = useExplorerStore(state => state.setQuery);
  const filters = useExplorerStore(state => state.filters);
  const setFilters = useExplorerStore(state => state.setFilters);
  const resetFilters = useExplorerStore(state => state.resetFilters);

  const debouncedQuery = useDebouncedValue(query, 250);

  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const {
    data: breeds = [],
    isLoading,
    error: breedsError,
  } = useQuery({
    queryKey: ['breeds'],
    queryFn: readBreeds,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['breed-groups'],
    queryFn: readGroups,
  });

  const { data: syncMetadata } = useQuery({
    queryKey: ['sync-metadata'],
    queryFn: getSyncMetadata,
  });

  const refreshLocalData = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['breeds'] });
    await queryClient.invalidateQueries({ queryKey: ['breed-groups'] });
    await queryClient.invalidateQueries({ queryKey: ['sync-metadata'] });
  }, [queryClient]);

  const runSync = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    setSyncMessage('');

    try {
      await initializeDatabase();
      await syncCatalog();
      await refreshLocalData();
      setSyncMessage('Catalog synced successfully.');
    } catch (error: unknown) {
      console.error('CATALOG SYNC ERROR:', error);
      setSyncMessage(
        'Sync failed. You can continue browsing saved breeds.',
      );
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, refreshLocalData]);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = NetInfo.addEventListener(state => {
      if (mounted) {
        setIsOnline(
          state.isConnected === true &&
          state.isInternetReachable !== false,
        );
      }
    });

    async function initialize() {
      try {
        await initializeDatabase();

        if (!mounted) return;

        await refreshLocalData();

        const cachedBreeds = await readBreeds();

        if (mounted && cachedBreeds.length === 0) {
          const network = await NetInfo.fetch();

          if (
            network.isConnected === true &&
            network.isInternetReachable !== false
          ) {
            await runSync();
          }
        }
      } catch (error: unknown) {
        console.error('DATABASE INITIALIZATION ERROR:', error);
        if (mounted) {
          setSyncMessage('Unable to initialize the local catalog.');
        }
      }
    }

    void initialize();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [refreshLocalData, runSync]);

  const filteredBreeds = useMemo(
    () => filterBreeds(breeds, debouncedQuery, filters),
    [breeds, debouncedQuery, filters],
  );

  const activeFilterCount =
    filters.groupIds.length +
    filters.sizeBands.length +
    filters.coatLengths.length +
    (filters.hypoallergenic !== null ? 1 : 0) +
    (filters.traitKey !== null ? 1 : 0);

  const toggleGroup = (id: string) => {
    const selected = filters.groupIds;

    setFilters({
      groupIds: selected.includes(id)
        ? selected.filter(value => value !== id)
        : [...selected, id],
    });
  };

  const toggleSize = (value: SizeBand) => {
    const selected = filters.sizeBands;

    setFilters({
      sizeBands: selected.includes(value)
        ? selected.filter(item => item !== value)
        : [...selected, value],
    });
  };

  const toggleCoat = (value: CoatLength) => {
    const selected = filters.coatLengths;

    setFilters({
      coatLengths: selected.includes(value)
        ? selected.filter(item => item !== value)
        : [...selected, value],
    });
  };

  const clearAll = () => {
    resetFilters();
    setQuery('');
  };

  const onRefresh = async () => {
    setIsRefreshing(true);

    try {
      if (isOnline) {
        await runSync();
      } else {
        await refreshLocalData();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const backgroundColor = dark ? '#101010' : '#F8FAFC';
  const cardColor = dark ? '#1B1B1B' : '#FFFFFF';
  const primaryText = dark ? '#FFFFFF' : NAVY;
  const secondaryText = dark ? '#BDBDBD' : '#64748B';
  const borderColor = dark ? '#333333' : '#E2E8F0';

  const renderBreed = ({ item }: { item: Breed }) => {
    const attributes = item.attributes;
    const imageUrl =
    attributes.images?.[0]?.thumb ??
    attributes.images?.[0]?.medium ??
    attributes.images?.[0]?.url ??
    attributes.images?.[0]?.large ??
    undefined;
        // const imageUrl =
    //   attributes.image?.thumbnail ??
    //   attributes.image?.medium ??
    //   attributes.image?.url;

    const breedName = attributes.name;
    const originValue = attributes.origin;

const origin =
  typeof originValue === 'string'
    ? originValue
    : originValue && typeof originValue === 'object'
      ? [originValue.country, originValue.region]
          .filter((value): value is string => Boolean(value))
          .join(', ')
      : 'Origin not specified';
    // const origin = attributes.origin || 'Origin not specified';
    const coatLength = attributes.coat?.length || 'Unknown coat';

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.push({
            pathname: '/breed/[id]',
            params: { id: item.id },
          })
        }
        style={[
          styles.breedCard,
          { backgroundColor: cardColor, borderColor },
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.breedImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            style={[
              styles.imagePlaceholder,
              { backgroundColor: dark ? '#292929' : '#FFF0E5' },
            ]}
          >
            <Text style={styles.placeholderEmoji}>🐕</Text>
          </View>
        )}

        <View style={styles.breedInfo}>
          <Text style={[styles.breedName, { color: primaryText }]}>
            {breedName}
          </Text>

          {!!attributes.description && (
            <Text
              numberOfLines={2}
              style={[styles.description, { color: secondaryText }]}
            >
              {attributes.description}
            </Text>
          )}

          <View style={styles.metaRow}>
            <Text
              numberOfLines={1}
              style={[styles.metaText, { color: secondaryText }]}
            >
              {origin ?? "text"}
            </Text>

            <Text
              style={[styles.coatBadge, { color: ORANGE }]}
            >
              {coatLength}
            </Text>
          </View>
        </View>

        <Text style={[styles.chevron, { color: secondaryText }]}>
          ›
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <FlatList
        data={filteredBreeds}
        keyExtractor={item => item.id}
        renderItem={renderBreed}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void onRefresh()}
            tintColor={ORANGE}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text style={[styles.brand, { color: ORANGE }]}>
                  TRIPARE AI
                </Text>
                <Text style={[styles.title, { color: primaryText }]}>
                  Dog Breed Explorer
                </Text>
                <Text
                  style={[styles.subtitle, { color: secondaryText }]}
                >
                  Find your perfect companion.
                </Text>
              </View>

              <View
                style={[
                  styles.pawCircle,
                  { backgroundColor: dark ? '#302016' : '#FFF0E5' },
                ]}
              >
                <Text style={styles.pawEmoji}>🐾</Text>
              </View>
            </View>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search breed or alternate name..."
              placeholderTextColor={dark ? '#999999' : '#94A3B8'}
              returnKeyType="search"
              clearButtonMode="while-editing"
              style={[
                styles.searchInput,
                {
                  backgroundColor: cardColor,
                  color: primaryText,
                  borderColor,
                },
              ]}
            />

            <View style={styles.connectionRow}>
              <View style={styles.connectionLabel}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isOnline ? '#22C55E' : '#F59E0B' },
                  ]}
                />
                <Text style={[styles.statusText, { color: secondaryText }]}>
                  {isOnline ? 'Online' : 'Offline mode'}
                </Text>
              </View>

              <Pressable
                onPress={() => void runSync()}
                disabled={!isOnline || isSyncing}
                style={[
                  styles.syncButton,
                  { opacity: !isOnline || isSyncing ? 0.55 : 1 },
                ]}
              >
                {isSyncing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.syncButtonText}>↻ Sync</Text>
                )}
              </Pressable>
            </View>

            {syncMetadata?.lastSyncedAt ? (
              <Text style={[styles.lastSynced, { color: secondaryText }]}>
                Last synced:{' '}
                {new Date(syncMetadata.lastSyncedAt).toLocaleString()}
              </Text>
            ) : null}

            {!!syncMessage && (
              <Text
                style={[
                  styles.syncMessage,
                  {
                    color: syncMessage.includes('failed') ||
                      syncMessage.includes('Unable')
                      ? '#EF4444'
                      : '#16A34A',
                  },
                ]}
              >
                {syncMessage}
              </Text>
            )}

            {!!breedsError && breeds.length === 0 && (
              <Text style={styles.errorText}>
                Could not load the local breed catalog. Pull down to retry.
              </Text>
            )}

            <View style={styles.filterHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: primaryText }]}>
                  Discover & Filter
                </Text>
                <Text style={[styles.filterSubtitle, { color: secondaryText }]}>
                  Narrow down your breed search
                </Text>
              </View>

              {activeFilterCount > 0 || query.length > 0 ? (
                <Pressable onPress={clearAll}>
                  <Text style={styles.clearText}>Clear all</Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={[styles.filterLabel, { color: secondaryText }]}>
              Breed group
            </Text>
            <View style={styles.chipRow}>
              {groups.map(group => (
                <FilterChip
                  key={group.id}
                  label={group.attributes.name}
                  dark={dark}
                  selected={filters.groupIds.includes(group.id)}
                  onPress={() => toggleGroup(group.id)}
                />
              ))}
            </View>

            <Text style={[styles.filterLabel, { color: secondaryText }]}>
              Size
            </Text>
            <View style={styles.chipRow}>
              {SIZE_OPTIONS.map(option => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  dark={dark}
                  selected={filters.sizeBands.includes(option.value)}
                  onPress={() => toggleSize(option.value)}
                />
              ))}
            </View>

            <Text style={[styles.filterLabel, { color: secondaryText }]}>
              Coat length
            </Text>
            <View style={styles.chipRow}>
              {COAT_OPTIONS.map(option => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  dark={dark}
                  selected={filters.coatLengths.includes(option.value)}
                  onPress={() => toggleCoat(option.value)}
                />
              ))}
            </View>

            <Text style={[styles.filterLabel, { color: secondaryText }]}>
              Hypoallergenic
            </Text>
            <View style={styles.chipRow}>
              <FilterChip
                label="Any"
                dark={dark}
                selected={filters.hypoallergenic === null}
                onPress={() => setFilters({ hypoallergenic: null })}
              />
              <FilterChip
                label="Yes"
                dark={dark}
                selected={filters.hypoallergenic === true}
                onPress={() => setFilters({ hypoallergenic: true })}
              />
              <FilterChip
                label="No"
                dark={dark}
                selected={filters.hypoallergenic === false}
                onPress={() => setFilters({ hypoallergenic: false })}
              />
            </View>

            <Text style={[styles.filterLabel, { color: secondaryText }]}>
              Temperament traits
            </Text>
            <View style={styles.chipRow}>
              {TRAIT_OPTIONS.map(option => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  dark={dark}
                  selected={filters.traitKey === option.value}
                  onPress={() =>
                    setFilters({
                      traitKey:
                        filters.traitKey === option.value
                          ? null
                          : option.value,
                    })
                  }
                />
              ))}
            </View>

            {filters.traitKey !== null && (
              <>
                <Text style={[styles.filterLabel, { color: secondaryText }]}>
                  Minimum trait score: {filters.minTraitScore}/5
                </Text>

                <View style={styles.chipRow}>
                  {[1, 2, 3, 4, 5].map(score => (
                    <FilterChip
                      key={score}
                      label={`${score}+`}
                      dark={dark}
                      selected={filters.minTraitScore === score}
                      onPress={() => setFilters({ minTraitScore: score })}
                    />
                  ))}
                </View>
              </>
            )}

            <View style={styles.resultsRow}>
              <Text style={[styles.resultsTitle, { color: primaryText }]}>
                Breeds
              </Text>
              <Text style={[styles.resultsCount, { color: secondaryText }]}>
                {filteredBreeds.length} of {breeds.length}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {isLoading ? (
              <ActivityIndicator size="large" color={ORANGE} />
            ) : (
              <>
                <Text style={styles.emptyEmoji}>🔎</Text>
                <Text style={[styles.emptyTitle, { color: primaryText }]}>
                  No breeds found
                </Text>
                <Text style={[styles.emptyText, { color: secondaryText }]}>
                  Try changing your search or clearing some filters.
                </Text>
                <Pressable onPress={clearAll} style={styles.emptyButton}>
                  <Text style={styles.emptyButtonText}>Clear filters</Text>
                </Pressable>
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop:49
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brand: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 5,
  },
  title: {
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 5,
  },
  pawCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pawEmoji: {
    fontSize: 30,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 14,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
  },
  syncButton: {
    backgroundColor: ORANGE,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 10,
    minWidth: 78,
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  lastSynced: {
    fontSize: 11,
    marginTop: 8,
  },
  syncMessage: {
    fontSize: 12,
    marginTop: 7,
  },
  errorText: {
    color: '#EF4444',
    marginTop: 10,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
  },
  filterSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  clearText: {
    color: ORANGE,
    fontSize: 13,
    fontWeight: '800',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 9,
    marginTop: 5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 9,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 22,
    marginRight: 7,
    marginBottom: 7,
  },
  chipText: {
    fontSize: 12,
  },
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 19,
    fontWeight: '900',
  },
  resultsCount: {
    fontSize: 12,
  },
  breedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  breedImage: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  imagePlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  breedInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 6,
  },
  breedName: {
    fontSize: 16,
    fontWeight: '800',
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  metaText: {
    flex: 1,
    fontSize: 11,
    marginRight: 8,
  },
  coatBadge: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  chevron: {
    fontSize: 27,
    fontWeight: '300',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 35,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 7,
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 16,
    backgroundColor: ORANGE,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
