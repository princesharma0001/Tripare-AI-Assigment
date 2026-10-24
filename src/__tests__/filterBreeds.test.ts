import { filterBreeds } from '../utils/filterBreeds';
import type { Breed } from '../types/dogApi';
import type { ExplorerFilters } from '../store/explorerStore';

const breed = {
  id: 'breed-1',
  attributes: {
    name: 'Golden Retriever',
    other_names: ['Golden'],
    hypoallergenic: false,
    male_weight: { min: 29, max: 34 },
    female_weight: { min: 25, max: 32 },
    coat: { length: 'long', colors: ['gold'] },
    traits: { good_with_children: 5 }
  },
  relationships: { group: { data: { id: 'sporting' } } }
} as Breed;

const filters: ExplorerFilters = {
  groupIds: [], sizeBands: [], coatLengths: [], hypoallergenic: null,
  minTraitScore: 3, traitKey: null
};

describe('filterBreeds', () => {
  it('matches breed names and other names case-insensitively', () => {
    expect(filterBreeds([breed], 'GOLDEN', filters)).toHaveLength(1);
    expect(filterBreeds([breed], 'retriever', filters)).toHaveLength(1);
  });

  it('filters by group and coat length', () => {
    expect(filterBreeds([breed], '', { ...filters, groupIds: ['other'] })).toHaveLength(0);
    expect(filterBreeds([breed], '', { ...filters, coatLengths: ['short'] })).toHaveLength(0);
    expect(filterBreeds([breed], '', { ...filters, coatLengths: ['long'] })).toHaveLength(1);
  });

  it('filters by trait threshold', () => {
    expect(filterBreeds([breed], '', { ...filters, traitKey: 'good_with_children', minTraitScore: 4 })).toHaveLength(1);
    expect(filterBreeds([breed], '', { ...filters, traitKey: 'good_with_dogs', minTraitScore: 4 })).toHaveLength(0);
  });
});
