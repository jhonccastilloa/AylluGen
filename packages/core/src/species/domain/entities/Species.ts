import type { SpeciesFields, SpeciesProps } from "../types/Species";
import { SpeciesError } from "../errors/SpeciesError";
import { SpeciesCode } from "../value-objects/SpeciesCode";
import { SpeciesDescription } from "../value-objects/SpeciesDescription";
import { SpeciesName } from "../value-objects/SpeciesName";

interface SpeciesState {
  id: string;
  userId: string;
  code: SpeciesCode;
  name: SpeciesName;
  description: SpeciesDescription | null;
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

  static create(props: SpeciesProps): Species {
    Species.assertIdentity(props);
    return new Species({
      id: props.id,
      userId: props.userId,
      code: SpeciesCode.create(props.code),
      name: SpeciesName.create(props.name),
      description: SpeciesDescription.create(props.description),
    });
  }

  /** Reconstruct persisted state without normalizing or restamping it. */
  static restore(props: SpeciesProps): Species {
    Species.assertIdentity(props);
    return new Species({
      id: props.id,
      userId: props.userId,
      code: SpeciesCode.restore(props.code),
      name: SpeciesName.restore(props.name),
      description:
        props.description === null
          ? null
          : SpeciesDescription.restore(props.description),
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
    return this.props.name.value;
  }
  get description() {
    return this.props.description?.value ?? null;
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
      input.name === undefined ? this.props.name : SpeciesName.create(input.name);
    const description =
      input.description === undefined
        ? this.props.description
        : SpeciesDescription.create(input.description);
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
