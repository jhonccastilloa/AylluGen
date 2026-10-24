import { injectable, inject } from "inversify";
import { SpeciesCode } from "@ayllugen/core/species/code";
import { SpeciesError } from "@ayllugen/core/species/errors";
import { TYPES } from "../../../../shared/di/types";
import type {
  SpeciesCreateInput,
  SpeciesResponse,
  SpeciesUpdateInput,
} from "../schemas/species.schema";
import type { SpeciesRecord } from "../SpeciesRecord";
import { rethrowSpeciesError } from "../speciesErrors";
import type { SpeciesUseCasesFactory } from "../ports/SpeciesUseCasesFactory";

const DEFAULT_SPECIES = [
  { code: "ALPACA", name: "Alpaca" },
  { code: "SHEEP", name: "Sheep" },
  { code: "LLAMA", name: "Llama" },
  { code: "VICUGNA", name: "Vicugna" },
];

/** API facade: HTTP projection and explicit server-only catalog initialization. */
@injectable()
export class SpeciesService {
  constructor(
    @inject(TYPES.SpeciesUseCasesFactory)
    private readonly commands: SpeciesUseCasesFactory,
  ) {}

  private async run<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      return rethrowSpeciesError(error);
    }
  }

  async getAll(userId: string): Promise<SpeciesResponse[]> {
    return this.run(async () => {
      await this.ensureDefaultSpecies(userId);
      return (await this.commands(userId).listSpecies.execute()).map((item) =>
        this.mapToResponse(item),
      );
    });
  }

  async getById(speciesId: string, userId: string): Promise<SpeciesResponse> {
    return this.run(async () => {
      await this.ensureDefaultSpecies(userId);
      return this.mapToResponse(
        await this.commands(userId).getSpecies.execute(speciesId),
      );
    });
  }

  async create(
    userId: string,
    payload: SpeciesCreateInput,
  ): Promise<SpeciesResponse> {
    return this.run(async () =>
      this.mapToResponse(
        await this.commands(userId).createSpecies.execute(payload),
      ),
    );
  }

  async update(
    speciesId: string,
    userId: string,
    payload: SpeciesUpdateInput,
  ): Promise<SpeciesResponse> {
    return this.run(async () =>
      this.mapToResponse(
        await this.commands(userId).updateSpecies.execute(speciesId, payload),
      ),
    );
  }

  async delete(speciesId: string, userId: string): Promise<void> {
    return this.run(() =>
      this.commands(userId).deleteSpecies.execute(speciesId),
    );
  }

  async resolveSpeciesForAnimal(
    userId: string,
    input: { speciesId?: string; speciesCode?: string; species?: string },
  ): Promise<{ speciesId: string; speciesCode: string; speciesName: string }> {
    return this.run(async () => {
      await this.ensureDefaultSpecies(userId);
      const commands = this.commands(userId);
      let result: SpeciesRecord;
      if (input.speciesId) {
        result = await commands.getSpecies.execute(input.speciesId);
      } else {
        const rawCode = input.speciesCode ?? input.species;
        if (!rawCode)
          throw new SpeciesError(
            "SPECIES_INVALID",
            "Debe enviar speciesId o speciesCode para crear un animal",
          );
        const code = SpeciesCode.normalize(rawCode);
        result = await commands.resolveSpecies.execute({ code, name: code });
      }
      return {
        speciesId: result.id,
        speciesCode: result.code,
        speciesName: result.name,
      };
    });
  }

  async ensureDefaultSpecies(userId: string): Promise<void> {
    return this.run(() =>
      this.commands(userId).initializeCatalog.execute(DEFAULT_SPECIES),
    );
  }

  private mapToResponse(species: SpeciesRecord): SpeciesResponse {
    return {
      id: species.id,
      userId: species.userId,
      code: species.code,
      name: species.name,
      description: species.description,
      clientCreatedAt: species.clientCreatedAt.toISOString(),
      clientUpdatedAt: species.clientUpdatedAt.toISOString(),
      createdAt: species.createdAt.toISOString(),
      updatedAt: species.updatedAt.toISOString(),
    };
  }
}
