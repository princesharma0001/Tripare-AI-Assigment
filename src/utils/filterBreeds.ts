import type { Breed } from '@/types/dogApi';
import type { ExplorerFilters, SizeBand } from '@/store/explorerStore';

function sizeBand(breed: Breed): SizeBand {
  const weights = [
    breed.attributes.male_weight?.max,
    breed.attributes.female_weight?.max
  ].filter((value): value is number => typeof value === 'number');
  const maxWeight = weights.length ? Math.max(...weights) : undefined;
  if (maxWeight === undefined) return 'unknown';
  if (maxWeight < 10) return 'small';
  if (maxWeight < 25) return 'medium';
  if (maxWeight < 45) return 'large';
  return 'giant';
}

function traitScore(breed: Breed, key: string): number | null {
  const value = breed.attributes.traits?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function filterBreeds(breeds: Breed[], query: string, filters: ExplorerFilters): Breed[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return breeds.filter(breed => {
    const attributes = breed.attributes;
    const names = [attributes.name, ...(attributes.other_names ?? [])].join(' ').toLocaleLowerCase();
    if (normalizedQuery && !names.includes(normalizedQuery)) return false;
    const groupId = breed.relationships?.group?.data?.id;
    if (filters.groupIds.length && (!groupId || !filters.groupIds.includes(groupId))) return false;
    if (filters.sizeBands.length && !filters.sizeBands.includes(sizeBand(breed))) return false;
    const coat = attributes.coat?.length?.toLocaleLowerCase();
    if (filters.coatLengths.length && (!coat || !filters.coatLengths.includes(coat as ExplorerFilters['coatLengths'][number]))) return false;
    if (filters.hypoallergenic !== null && attributes.hypoallergenic !== filters.hypoallergenic) return false;
    if (filters.traitKey) {
      const score = traitScore(breed, filters.traitKey);
      if (score === null || score < filters.minTraitScore) return false;
    }
    return true;
  });
}
