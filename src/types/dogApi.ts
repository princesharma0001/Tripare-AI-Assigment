import { z } from "zod";

const rangeSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .nullable()
  .optional();
const imageSchema = z.object({
  id: z.string(),
  url: z.string().url().nullish(),
  thumb: z.string().url().nullish(),
  medium: z.string().url().nullish(),
  large: z.string().url().nullish(),
  attribution: z
    .object({
      author: z.string().nullish(),
      license: z.string().nullish(),
      license_url: z.string().url().nullish(),
      source: z.string().nullish(),
      source_url: z.string().url().nullish(),
    })
    .nullish(),
});

export const breedSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  attributes: z.object({
    name: z.string(),
    description: z.string().nullable().optional(),
    hypoallergenic: z.boolean().nullable().optional(),
    life: rangeSchema,
    male_weight: rangeSchema,
    female_weight: rangeSchema,
    male_height: rangeSchema,
    female_height: rangeSchema,
    origin: z
      .object({
        country: z.string().nullable().optional(),
        region: z.string().nullable().optional(),
        era: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    coat: z
      .object({
        type: z.string().nullable().optional(),
        length: z.string().nullable().optional(),
        colors: z.array(z.string()).optional(),
      })
      .nullable()
      .optional(),
    traits: z.record(z.string(), z.unknown()).optional(),
    other_names: z.array(z.string()).optional(),
    recognized_by: z.array(z.string()).optional(),
    sources: z
      .array(
        z.object({
          url: z.string().url().optional(),
          title: z.string().optional(),
        })
      )
      .optional(),
    images: z.array(imageSchema).optional(),
  }),
  relationships: z
    .object({
      group: z
        .object({ data: z.object({ id: z.string() }).nullable().optional() })
        .optional(),
    })
    .optional(),
});

export const groupSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  attributes: z.object({ name: z.string() }),
});

export const paginatedBreedsSchema = z.object({
  data: z.array(breedSchema),
  meta: z
    .object({
      pagination: z
        .object({
          current: z.number().optional(),
          next: z.number().nullable().optional(),
          last: z.number().optional(),
          records: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

export const groupsResponseSchema = z.object({ data: z.array(groupSchema) });

export type Breed = z.infer<typeof breedSchema>;
export type BreedGroup = z.infer<typeof groupSchema>;
