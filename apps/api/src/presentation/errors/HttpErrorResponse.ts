import type { HttpResult } from "../../protocols/HttpResult";

export interface HttpErrorBody {
  error: string;
  code: string;
  details?: Array<{ path: string[]; message: string }>;
}

export type HttpErrorResponse = HttpResult<HttpErrorBody>;
