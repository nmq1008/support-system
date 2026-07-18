/** Application-level HTTP error with a stable code for the frontend/i18n. */
export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new HttpError(400, code, message, details);
export const unauthorized = (message = 'Unauthorized') =>
  new HttpError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'Forbidden') =>
  new HttpError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Not found') =>
  new HttpError(404, 'NOT_FOUND', message);
export const conflict = (code: string, message: string, details?: unknown) =>
  new HttpError(409, code, message, details);
