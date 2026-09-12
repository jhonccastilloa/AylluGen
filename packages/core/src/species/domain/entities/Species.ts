import type { SpeciesFields, SpeciesProps } from "../types/Species";
import { normalizeSpeciesFields } from "../services/SpeciesRules";
import { SpeciesError } from "../errors/SpeciesError";

export class Species {
  private constructor(private props: SpeciesProps) {}

  static create(props: SpeciesProps): Species {
    return new Species({
      id: props.id,
      userId: props.userId,
      ...normalizeSpeciesFields(props),
    });
  }

  /** Reconstruct trusted persisted state without normalizing or restamping it. */
  static restore(props: SpeciesProps): Species {
    return new Species({
      id: props.id,
      userId: props.userId,
      code: props.code,
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
    return this.props.code;
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
    const fields = normalizeSpeciesFields({
      code: input.code ?? this.code,
      name: input.name ?? this.name,
      description:
        input.description === undefined ? this.description : input.description,
    });
    this.props = { id: this.id, userId: this.userId, ...fields };
  }

  toPrimitives(): SpeciesProps {
    return { ...this.props };
  }
}
