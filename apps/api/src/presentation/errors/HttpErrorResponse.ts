import type { HttpResult } from "../http/HttpResult";

export interface HttpErrorBody {
  error: string;
  code: string;
  details?: Array<{ path: string[]; message: string }>;
}

export type HttpErrorResponse = HttpResult<HttpErrorBody>;
