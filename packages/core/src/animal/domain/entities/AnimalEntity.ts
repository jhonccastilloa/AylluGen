import { AnimalError } from "../errors/AnimalError";

export type AnimalSex = "MALE" | "FEMALE";
export type AnimalStatus = "ACTIVE" | "SOLD" | "DECEASED";

export interface IAnimalProps {
  id: string;
  userId: string;
  code: string;
  crotal: string | null;
  speciesId: string;
  sex: AnimalSex;
  birthDate: string | null;
  fatherId: string | null;
  motherId: string | null;
  status: AnimalStatus;
  exitDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class AnimalEntity {
  private readonly props: Readonly<IAnimalProps>;

  private constructor(props: IAnimalProps) {
    this.props = {
      id: props.id,
      userId: props.userId,
      code: props.code,
      crotal: props.crotal,
      speciesId: props.speciesId,
      sex: props.sex,
      birthDate: props.birthDate,
      fatherId: props.fatherId,
      motherId: props.motherId,
      status: props.status,
      exitDate: props.exitDate,
      createdAt: new Date(props.createdAt.getTime()),
      updatedAt: new Date(props.updatedAt.getTime()),
    };
  }

  static create(
    props: IAnimalProps,
    today = new Date().toISOString().slice(0, 10),
  ): AnimalEntity {
    const code = props.code.trim().toUpperCase();
    const crotal =
      props.crotal === null ? null : props.crotal.trim().toUpperCase();
    if (
      !props.id.trim() ||
      !props.userId.trim() ||
      !props.speciesId.trim() ||
      !code ||
      code.length > 50 ||
      (crotal !== null && (!crotal || crotal.length > 50)) ||
      !["MALE", "FEMALE"].includes(props.sex) ||
      !["ACTIVE", "SOLD", "DECEASED"].includes(props.status) ||
      (props.fatherId !== null && !props.fatherId.trim()) ||
      (props.motherId !== null && !props.motherId.trim()) ||
      !(props.createdAt instanceof Date) ||
      !Number.isFinite(props.createdAt.getTime()) ||
      !(props.updatedAt instanceof Date) ||
      !Number.isFinite(props.updatedAt.getTime())
    )
      throw new AnimalError(
        "ANIMAL_INVALID",
        "Los datos del animal son inválidos.",
      );

    for (const date of [props.birthDate, props.exitDate]) {
      if (date === null) continue;
      const parsed = new Date(`${date}T00:00:00.000Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        date < "0001-01-01" ||
        !Number.isFinite(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== date ||
        date > today
      ) {
        throw new AnimalError(
          "ANIMAL_INVALID_DATES",
          "Las fechas deben ser válidas y no futuras.",
        );
      }
    }
    if (
      (props.status === "ACTIVE" && props.exitDate !== null) ||
      (props.birthDate !== null &&
        props.exitDate !== null &&
        props.exitDate < props.birthDate)
    ) {
      throw new AnimalError(
        "ANIMAL_INVALID_DATES",
        "La fecha de baja no es compatible con el estado o nacimiento.",
      );
    }
    if (
      props.fatherId === props.id ||
      props.motherId === props.id ||
      (props.fatherId !== null && props.fatherId === props.motherId)
    ) {
      throw new AnimalError(
        "ANIMAL_INVALID_PARENT",
        "Los padres deben ser distintos entre sí y del animal.",
      );
    }
    return new AnimalEntity({ ...props, code, crotal });
  }

  // Typed persistence is trusted; reconstruction preserves stored values.
  static restore(props: IAnimalProps): AnimalEntity {
    return new AnimalEntity(props);
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get code(): string {
    return this.props.code;
  }
  get crotal(): string | null {
    return this.props.crotal;
  }
  get speciesId(): string {
    return this.props.speciesId;
  }
  get sex(): AnimalSex {
    return this.props.sex;
  }
  get birthDate(): string | null {
    return this.props.birthDate;
  }
  get fatherId(): string | null {
    return this.props.fatherId;
  }
  get motherId(): string | null {
    return this.props.motherId;
  }
  get status(): AnimalStatus {
    return this.props.status;
  }
  get exitDate(): string | null {
    return this.props.exitDate;
  }
  get isFounder(): boolean {
    return this.fatherId === null && this.motherId === null;
  }
  get createdAt(): Date {
    return new Date(this.props.createdAt.getTime());
  }
  get updatedAt(): Date {
    return new Date(this.props.updatedAt.getTime());
  }
}
