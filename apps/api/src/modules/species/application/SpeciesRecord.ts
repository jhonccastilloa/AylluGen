import type { SpeciesData } from "@ayllugen/core/species/types";

/** Adapter result carrying API-only audit data; the shared core ignores it. */
export interface SpeciesRecord extends SpeciesData {
  createdAt: Date;
  updatedAt: Date;
}
