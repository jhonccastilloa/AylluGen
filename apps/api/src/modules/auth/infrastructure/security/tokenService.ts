import { config } from "../../../../shared/constants/config";
import { JwtTokenService } from "./JwtTokenService";

export const tokenService = new JwtTokenService(config);
