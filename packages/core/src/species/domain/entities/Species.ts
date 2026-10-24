import type { SpeciesFields, SpeciesProps } from "../types/Species";
import { SpeciesError } from "../errors/SpeciesError";
import { SpeciesCode } from "../value-objects/SpeciesCode";

interface SpeciesState {
  id: string;
  userId: string;
  code: SpeciesCode;
  name: string;
  description: string | null;
}

export class Species {
  private constructor(private props: SpeciesState) {}

  private static assertIdentity(props: SpeciesProps): void {
    if (!props.id?.trim())
      throw new SpeciesError(
        "SPECIES_INVALID",
        "El ID de la especie es obligatorio.",
        "id",
      );
    if (!props.userId?.trim())
      throw new SpeciesError(
        "SPECIES_INVALID",
        "El ID del usuario es obligatorio.",
        "userId",
      );
  }

  private static createName(input: string): string {
    const value = input.trim();
    if (value.length < 2 || value.length > 80)
      throw new SpeciesError(
        "SPECIES_INVALID",
        "El nombre debe tener entre 2 y 80 caracteres.",
        "name",
      );
    return value;
  }

  private static createDescription(input: string | null): string | null {
    const value = input?.trim() || null;
    if (value !== null && value.length > 200)
      throw new SpeciesError(
        "SPECIES_INVALID",
        "La descripción no puede exceder 200 caracteres.",
        "description",
      );
    return value;
  }

  static create(props: SpeciesProps): Species {
    Species.assertIdentity(props);
    return new Species({
      id: props.id,
      userId: props.userId,
      code: SpeciesCode.create(props.code),
      name: Species.createName(props.name),
      description: Species.createDescription(props.description),
    });
  }

  /** Reconstruct persisted state without changing existing text or timestamps. */
  static restore(props: SpeciesProps): Species {
    Species.assertIdentity(props);
    return new Species({
      id: props.id,
      userId: props.userId,
      code: SpeciesCode.restore(props.code),
      name: props.name,
      description: props.description,
    });
  }

  get id() {
    return this.props.id;
  }
  get userId() {
    return this.props.userId;
  }
  get code() {
    return this.props.code.value;
  }
  get name() {
    return this.props.name;
  }
  get description() {
    return this.props.description;
  }

  changeDetails(input: Partial<SpeciesFields>): void {
    if (
      !["code", "name", "description"].some(
        (key) => input[key as keyof SpeciesFields] !== undefined,
      )
    )
      throw new SpeciesError(
        "SPECIES_INVALID",
        "Debe enviar al menos un campo para actualizar.",
      );
    const code =
      input.code === undefined ? this.props.code : SpeciesCode.create(input.code);
    const name =
      input.name === undefined ? this.props.name : Species.createName(input.name);
    const description =
      input.description === undefined
        ? this.props.description
        : Species.createDescription(input.description);
    this.props = { id: this.id, userId: this.userId, code, name, description };
  }

  toPrimitives(): SpeciesProps {
    return {
      id: this.id,
      userId: this.userId,
      code: this.code,
      name: this.name,
      description: this.description,
    };
  }
}
