import { z } from "zod";
import { SyncAction } from "../../domain/entities/Sync";

export const syncPushSchema = z
  .object({
    userId: z.uuid().describe("User ID"),
    deviceId: z.string().describe("Device identifier"),
    changes: z
      .array(
        z.object({
          action: z
            .enum(SyncAction)
            .describe("Action: CREATE, UPDATE, or DELETE"),
          tableName: z
            .string()
            .describe(
              "Table name: animals, breedings, health_records, production_records",
            ),
          recordId: z.uuid().describe("Record ID"),
          data: z.any().describe("Record data"),
          clientVersion: z
            .number()
            .int()
            .min(1)
            .describe("Client sync version"),
        }),
      )
      .describe("List of changes to sync"),
  })
  .openapi({
    title: "SyncPushInput",
    description: "Schema for pushing changes to server",
    example: {
      userId: "123e4567-e89b-12d3-a456-426614174001",
      deviceId: "device-12345",
      changes: [
        {
          action: SyncAction.CREATE,
          tableName: "animals",
          recordId: "123e4567-e89b-12d3-a456-426614174010",
          data: {
            crotal: "CR12345",
            sex: "FEMALE",
            speciesCode: "SHEEP",
            isFounder: true,
          },
          clientVersion: 1,
        },
      ],
    },
  });

export const syncPullSchema = z
  .object({
    userId: z.uuid().describe("User ID"),
    deviceId: z.string().describe("Device identifier"),
    lastSyncAt: z.iso.datetime().optional().describe("Last sync timestamp"),
    tables: z
      .array(z.string())
      .default(["animals", "breedings", "health_records", "production_records"])
      .describe("Tables to sync"),
  })
  .openapi({
    title: "SyncPullInput",
    description: "Schema for pulling changes from server",
    example: {
      userId: "123e4567-e89b-12d3-a456-426614174001",
      deviceId: "device-12345",
      lastSyncAt: "2024-01-20T00:00:00Z",
      tables: ["animals", "breedings"],
    },
  });

export const syncResultSchema = z
  .object({
    success: z.boolean(),
    conflicts: z
      .array(
        z.object({
          tableName: z.string(),
          recordId: z.uuid(),
          serverVersion: z.any(),
          clientVersion: z.any(),
        }),
      )
      .optional(),
    errors: z
      .array(
        z.object({
          tableName: z.string(),
          recordId: z.uuid(),
          message: z.string(),
        }),
      )
      .optional(),
    syncedChanges: z.number(),
  })
  .openapi({
    title: "SyncResult",
    description: "Sync result schema",
  });

export const syncDataSchema = z
  .object({
    animals: z.array(z.any()).optional(),
    breedings: z.array(z.any()).optional(),
    healthRecords: z.array(z.any()).optional(),
    productionRecords: z.array(z.any()).optional(),
    syncTimestamp: z.string().datetime(),
  })
  .openapi({
    title: "SyncDataResponse",
    description: "Sync data response schema",
  });

export const conflictResolutionSchema = z.object({
  resolution: z
    .enum(["server", "client"])
    .describe("Conflict resolution: keep server or client version"),
  tableName: z
    .string("El nombre de la tabla debe ser un string valido")
    .describe("Nombre de la tabla"),
  recordId: z
    .uuid("El ID del registro debe ser un UUID valido")
    .describe("ID único del registro"),
});

//tableName, recordId
export const resolveConflictParamsSchema = z.object({});
export type SyncPushInput = z.infer<typeof syncPushSchema>;
export type SyncPullInput = z.infer<typeof syncPullSchema>;
export type SyncResult = z.infer<typeof syncResultSchema>;
export type SyncDataResponse = z.infer<typeof syncDataSchema>;
