import { SpecieError } from "../errors/SpecieError";

export interface ICreateSpecieProps {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
}

interface ISpecieProps {
  id: string;
  userId: string;
  name: string;
  description: string | null;
}

export class SpecieEntity {
  private readonly props: Readonly<ISpecieProps>;

  private constructor(props: ISpecieProps) {
    this.props = {
      id: props.id,
      userId: props.userId,
      name: props.name,
      description: props.description,
    };
  }

  private static assertIdentity(
    props: Pick<ICreateSpecieProps, "id" | "userId">,
  ): void {
    if (!props.id?.trim())
      throw new SpecieError(
        "SPECIE_INVALID",
        "El ID de la especie es obligatorio.",
      );
    if (!props.userId?.trim())
      throw new SpecieError(
        "SPECIE_INVALID",
        "El ID del usuario es obligatorio.",
      );
  }

  private static createName(input: string): string {
    const value = input.trim();
    if (value.length < 2 || value.length > 80)
      throw new SpecieError(
        "SPECIE_INVALID",
        "El nombre debe tener entre 2 y 80 caracteres.",
      );
    return value;
  }

  private static createDescription(input: string | null): string | null {
    const value = input?.trim() || null;
    if (value !== null && value.length > 200)
      throw new SpecieError(
        "SPECIE_INVALID",
        "La descripción no puede exceder 200 caracteres.",
      );
    return value;
  }

  static create(props: ICreateSpecieProps): SpecieEntity {
    SpecieEntity.assertIdentity(props);
    return new SpecieEntity({
      id: props.id,
      userId: props.userId,
      name: SpecieEntity.createName(props.name),
      description: SpecieEntity.createDescription(props.description ?? null),
    });
  }

  /** Rehydrates trusted persistence data without creation validation or normalization. */
  static restore(props: ISpecieProps): SpecieEntity {
    return new SpecieEntity(props);
  }

  get id() {
    return this.props.id;
  }
  get userId() {
    return this.props.userId;
  }
  get name() {
    return this.props.name;
  }
  get description() {
    return this.props.description;
  }
}
