export interface SpeciesUsage {
  hasAnimals(speciesId: string): Promise<boolean>;
}
