import { injectable, inject } from "inversify";
import { SpeciesError } from "@ayllugen/core/species/errors";
import type { ISpeciesData } from "@ayllugen/core/species/types";
import { TYPES } from "../../../../shared/di/types";
import type {
  SpeciesCreateInput,
  SpeciesResponse,
  SpeciesUpdateInput,
} from "../schemas/species.schema";
import { rethrowSpeciesError } from "../speciesErrors";
import type { SpecieUseCasesFactory } from "../ports/SpecieUseCasesFactory";

const DEFAULT_SPECIES = [
  "Alpaca", "Sheep", "Llama", "Vicugna",
];

/** API facade: HTTP projection and explicit server-only catalog initialization. */
@injectable()
export class SpeciesService {
  constructor(
    @inject(TYPES.SpecieUseCasesFactory)
    private readonly commands: SpecieUseCasesFactory,
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
      return (await this.commands(userId).listSpecie.execute()).map((item) =>
        this.mapToResponse(item),
      );
    });
  }

  async getById(speciesId: string, userId: string): Promise<SpeciesResponse> {
    return this.run(async () => {
      await this.ensureDefaultSpecies(userId);
      return this.mapToResponse(
        await this.commands(userId).getSpecie.execute(speciesId),
      );
    });
  }

  async create(
    userId: string,
    payload: SpeciesCreateInput,
  ): Promise<SpeciesResponse> {
    return this.run(async () =>
      this.mapToResponse(
        await this.commands(userId).createSpecie.execute(payload),
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
        await this.commands(userId).updateSpecie.execute(speciesId, payload),
      ),
    );
  }

  async delete(speciesId: string, userId: string): Promise<void> {
    return this.run(() =>
      this.commands(userId).deleteSpecie.execute(speciesId),
    );
  }

  async resolveSpeciesForAnimal(
    userId: string,
    input: { speciesId: string },
  ): Promise<{ speciesId: string; speciesName: string }> {
    return this.run(async () => {
      await this.ensureDefaultSpecies(userId);
      const commands = this.commands(userId);
      if (!input.speciesId)
        throw new SpeciesError("SPECIES_INVALID", "Debe enviar speciesId para crear un animal");
      const result = await commands.getSpecie.execute(input.speciesId);
      return {
        speciesId: result.id,
        speciesName: result.name,
      };
    });
  }

  async ensureDefaultSpecies(userId: string): Promise<void> {
    return this.run(() =>
      this.commands(userId).initializeCatalog.execute(DEFAULT_SPECIES),
    );
  }

  private mapToResponse(species: ISpeciesData): SpeciesResponse {
    return {
      id: species.id,
      userId: species.userId,
      name: species.name,
      description: species.description,
      clientCreatedAt: species.clientCreatedAt.toISOString(),
      clientUpdatedAt: species.clientUpdatedAt.toISOString(),
      createdAt: species.createdAt.toISOString(),
      updatedAt: species.updatedAt.toISOString(),
    };
  }
}
