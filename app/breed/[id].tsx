import { useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBreedById } from "@/services/dogApi";
import { readBreeds, upsertBreeds } from "@/db/breedRepository";
import type { Breed } from "@/types/dogApi";

const traitLabels: Record<string, string> = {
  energy: "Energy",
  barking: "Barking",
  drooling: "Drooling",
  grooming: "Grooming",
  shedding: "Shedding",
  trainability: "Trainability",
  good_with_dogs: "Good with dogs",
  exercise_minutes: "Daily exercise (minutes)",
  apartment_friendly: "Apartment friendly",
  good_with_children: "Good with children",
  good_with_strangers: "Good with strangers",
};

type NumericRange =
  | {
      min?: number | undefined;
      max?: number | undefined;
    }
  | null
  | undefined;

function range(value: NumericRange, unit: string): string {
  if (!value) return "Not available";

  const { min, max } = value;

  if (min !== undefined && max !== undefined) {
    return `${min}–${max} ${unit}`;
  }

  if (min !== undefined) return `${min}+ ${unit}`;
  if (max !== undefined) return `Up to ${max} ${unit}`;

  return "Not available";
}

function TraitScale({
  label,
  score,
  dark,
}: {
  label: string;
  score: number;
  dark: boolean;
}) {
  const normalized = Math.max(0, Math.min(5, score));

  return (
    <View style={styles.trait}>
      <View style={styles.traitHeader}>
        <Text
          style={{
            color: dark ? "#F8FAFC" : "#344054",
            fontWeight: "600",
          }}
        >
          {label}
        </Text>

        <Text style={{ color: dark ? "#98A2B3" : "#667085" }}>{score}/5</Text>
      </View>

      <View style={styles.track}>
        {Array.from({ length: 5 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              {
                backgroundColor:
                  index < normalized ? "#F97316" : dark ? "#344054" : "#EAECF0",
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export default function BreedDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const dark = useColorScheme() === "dark";

  const foreground = dark ? "#F8FAFC" : "#172033";
  const muted = dark ? "#AAB6C8" : "#667085";
  const background = dark ? "#101827" : "#F7F8FC";

  const query = useQuery({
    queryKey: ["breed", id],
    queryFn: async () => {
      const cached = (await readBreeds()).find((breed) => breed.id === id);

      try {
        const fresh = await fetchBreedById(id);
        await upsertBreeds([fresh]);
        return fresh;
      } catch (error: unknown) {
        if (cached) return cached;
        throw error;
      }
    },
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (query.data) {
      void queryClient.invalidateQueries({
        queryKey: ["breeds", "local"],
      });
    }
  }, [query.data, queryClient]);

  const breed: Breed | undefined = query.data;

  const images = breed?.attributes.images ?? [];
  const heroImage = images[0]?.medium ?? images[0]?.url ?? undefined;

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <Stack.Screen
        options={{
          title: breed?.attributes.name ?? "Breed details",
          headerStyle: { backgroundColor: background },
          headerTintColor: foreground,
        }}
      />

      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#F97316" />
          <Text style={{ color: muted, marginTop: 10 }}>Loading breed…</Text>
        </View>
      ) : null}

      {query.isError && !breed ? (
        <Text style={{ color: foreground, padding: 20 }}>
          Could not load this breed. Connect to the internet and try again.
        </Text>
      ) : null}

      {breed ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.title, { color: foreground }]}>
            {breed.attributes.name}
          </Text>

          <Text style={[styles.subtitle, { color: muted }]}>
            {breed.attributes.origin?.country ?? "Origin unknown"} ·{" "}
            {breed.attributes.hypoallergenic
              ? "Hypoallergenic"
              : "Not listed as hypoallergenic"}
          </Text>

          <Text style={[styles.section, { color: foreground }]}>Overview</Text>

          {heroImage ? (
            <Image
              source={{ uri: heroImage }}
              contentFit="cover"
              style={styles.hero}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.hero, styles.imagePlaceholder]}>
              <Text style={{ color: muted }}>No image available</Text>
            </View>
          )}

          <Text style={[styles.body, { color: foreground }]}>
            {breed.attributes.description ?? "No description is available."}
          </Text>

          <View style={styles.infoCard}>
            <Text style={[styles.infoTitle, { color: foreground }]}>
              Life span
            </Text>
            <Text style={{ color: muted }}>
              {range(breed.attributes.life, "years")}
            </Text>

            <Text style={[styles.infoTitle, { color: foreground }]}>
              Weight
            </Text>
            <Text style={{ color: muted }}>
              Male: {range(breed.attributes.male_weight, "kg")} · Female:{" "}
              {range(breed.attributes.female_weight, "kg")}
            </Text>

            <Text style={[styles.infoTitle, { color: foreground }]}>
              Height
            </Text>
            <Text style={{ color: muted }}>
              Male: {range(breed.attributes.male_height, "cm")} · Female:{" "}
              {range(breed.attributes.female_height, "cm")}
            </Text>

            <Text style={[styles.infoTitle, { color: foreground }]}>
              Origin
            </Text>
            <Text style={{ color: muted }}>
              {[
                breed.attributes.origin?.era,
                breed.attributes.origin?.region,
                breed.attributes.origin?.country,
              ]
                .filter(Boolean)
                .join(" · ") || "Unknown"}
            </Text>

            <Text style={[styles.infoTitle, { color: foreground }]}>
              Other names
            </Text>
            <Text style={{ color: muted }}>
              {breed.attributes.other_names?.join(", ") || "None listed"}
            </Text>

            <Text style={[styles.infoTitle, { color: foreground }]}>
              Recognized by
            </Text>
            <Text style={{ color: muted }}>
              {breed.attributes.recognized_by?.join(", ") || "Not listed"}
            </Text>
          </View>

          <Text style={[styles.section, { color: foreground }]}>Traits</Text>

          {Object.entries(traitLabels).map(([key, label]) => {
            const score = breed.attributes.traits?.[key];

            if (typeof score !== "number") return null;

            if (key === "exercise_minutes") {
              return (
                <Text key={key} style={[styles.body, { color: muted }]}>
                  {label}: {score}
                </Text>
              );
            }

            return (
              <TraitScale key={key} label={label} score={score} dark={dark} />
            );
          })}

          <Text style={[styles.body, { color: foreground, marginTop: 12 }]}>
            Temperament:{" "}
            {Array.isArray(breed.attributes.traits?.temperament)
              ? breed.attributes.traits.temperament
                  .filter((value): value is string => typeof value === "string")
                  .join(" · ")
              : "Not listed"}
          </Text>

          <Text style={[styles.section, { color: foreground }]}>
            Gallery & attribution
          </Text>

          {images?.map((image) => {
            const imageUri = image.medium ?? image.url ?? undefined;

            return (
              <View key={image.id} style={styles.galleryItem}>
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.galleryImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={[styles.galleryImage, styles.imagePlaceholder]}>
                    <Text style={{ color: muted }}>No image available</Text>
                  </View>
                )}

                <Text style={[styles.caption, { color: muted }]}>
                  {image.attribution?.author ?? "Author not listed"} ·{" "}
                  {image.attribution?.license ?? "License not listed"}
                </Text>

                {/* {image.attribution?.source_url ? (
                  <></>
                ) : // <Text
                //   selectable
                //   style={[styles.linkText, { color: "#F97316" }]}
                // >
                //   {image.attribution.source_url}
                // </Text>
                null} */}

                {/* {image.attribution?.license_url ? (
                  <Text
                    selectable
                    style={[styles.linkText, { color: "#F97316" }]}
                  >
                    {image.attribution.license_url}
                  </Text>
                ) : null} */}
              </View>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 13,
  },
  section: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
  },
  hero: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: "#EAECF0",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  infoCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#8A94A60D",
    gap: 6,
  },
  infoTitle: {
    fontWeight: "700",
    marginTop: 8,
  },
  trait: {
    marginBottom: 14,
  },
  traitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  track: {
    flexDirection: "row",
    gap: 5,
  },
  segment: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  galleryItem: {
    marginBottom: 18,
  },
  galleryImage: {
    width: "100%",
    height: 210,
    borderRadius: 14,
    backgroundColor: "#EAECF0",
  },
  caption: {
    fontSize: 12,
    marginTop: 8,
  },
  linkText: {
    fontSize: 11,
    marginTop: 3,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
