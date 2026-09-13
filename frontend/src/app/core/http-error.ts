import { HttpErrorResponse } from '@angular/common/http';

export function httpErrorMessage(error: unknown, fallback = 'Ocurrió un error'): string {
  if (error instanceof HttpErrorResponse) {
    const message = error.error?.message;
    if (Array.isArray(message)) {
      return message.join('. ');
    }
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }
  return fallback;
}
