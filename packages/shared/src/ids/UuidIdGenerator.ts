import { v4 as uuidV4 } from "uuid";

/** Generates UUID v4 identifiers using the host's secure random source. */
export class UuidIdGenerator {
  generate(): string {
    return uuidV4();
  }
}

/** Function form for APIs such as WatermelonDB's ID generator hook. */
export const generateUuid = (): string => uuidV4();
