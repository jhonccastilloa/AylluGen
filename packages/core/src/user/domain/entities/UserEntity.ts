import { UserError } from "../errors/UserError";

export interface IUserProps {
  id: string;
  dni: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserEntity {
  private readonly props: Readonly<IUserProps>;

  private constructor(props: IUserProps) {
    this.props = {
      id: props.id,
      dni: props.dni,
      passwordHash: props.passwordHash,
      createdAt: new Date(props.createdAt.getTime()),
      updatedAt: new Date(props.updatedAt.getTime()),
    };
  }

  static create(props: IUserProps): UserEntity {
    if (
      !props.id?.trim() ||
      !/^\d{8}$/.test(props.dni) ||
      !props.passwordHash?.trim() ||
      !(props.createdAt instanceof Date) ||
      !Number.isFinite(props.createdAt.getTime()) ||
      !(props.updatedAt instanceof Date) ||
      !Number.isFinite(props.updatedAt.getTime())
    ) {
      throw new UserError(
        "USER_INVALID",
        "Los datos de la cuenta son inválidos.",
      );
    }
    return new UserEntity(props);
  }

  /** Rehydrates trusted persistence data without creation validation or normalization. */
  static restore(props: IUserProps): UserEntity {
    return new UserEntity(props);
  }
  get id() {
    return this.props.id;
  }
  get dni() {
    return this.props.dni;
  }
  get passwordHash() {
    return this.props.passwordHash;
  }
  get createdAt() {
    return new Date(this.props.createdAt.getTime());
  }
  get updatedAt() {
    return new Date(this.props.updatedAt.getTime());
  }
}
