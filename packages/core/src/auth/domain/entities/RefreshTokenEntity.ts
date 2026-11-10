import { AuthError } from "../errors/AuthError";

export interface IRefreshTokenProps {
  userId: string;
  token: string;
  expiresAt: Date;
}

export class RefreshTokenEntity {
  private constructor(private readonly props: IRefreshTokenProps) {}

  static create(props: IRefreshTokenProps): RefreshTokenEntity {
    if (
      !props.userId.trim() ||
      !props.token.trim() ||
      !(props.expiresAt instanceof Date) ||
      !Number.isFinite(props.expiresAt.getTime())
    ) {
      throw new AuthError(
        "INVALID_REFRESH_TOKEN",
        "Los datos del token de renovación son inválidos.",
      );
    }
    return new RefreshTokenEntity({
      userId: props.userId,
      token: props.token,
      expiresAt: new Date(props.expiresAt.getTime()),
    });
  }

  get userId(): string {
    return this.props.userId;
  }

  get token(): string {
    return this.props.token;
  }

  get expiresAt(): Date {
    return new Date(this.props.expiresAt.getTime());
  }
}
