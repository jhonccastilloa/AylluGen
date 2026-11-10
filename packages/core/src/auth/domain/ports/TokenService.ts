export interface ITokenIdentity {
  userId: string;
  dni: string;
}
export interface IIssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}
export interface ITokenService {
  issue(identity: ITokenIdentity): IIssuedTokens;
  verifyRefresh(token: string): ITokenIdentity;
}
