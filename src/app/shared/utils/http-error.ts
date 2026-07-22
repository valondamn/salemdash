import { HttpErrorResponse } from '@angular/common/http';

/**
 * Turns an HTTP/RxJS error into a message that's safe to show a person.
 *
 * A raw HttpErrorResponse's own `.message` is a technical string like
 * "Http failure response for https://.../ssm/login: 401 Unauthorized" — never
 * something a non-technical user should see. This prefers whatever message the
 * backend actually sent in the response body, then falls back to a
 * status-code-based message, and only uses the fallback text as a last resort.
 */
export function resolveApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error;
    const backendMessage =
      typeof body === 'string'
        ? body
        : body?.message ?? body?.error ?? body?.detail;

    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage;
    }

    switch (error.status) {
      case 401:
        return 'Сессия истекла или неверные данные для входа. Войдите заново.';
      case 403:
        return 'Недостаточно прав для выполнения действия.';
      case 404:
        return 'Объект не найден.';
      case 409:
        return 'Конфликт данных. Проверьте введённые значения.';
      case 0:
        return 'Не удалось подключиться к серверу. Проверьте интернет-соединение.';
      default:
        if (error.status >= 500) return 'Сервер временно недоступен. Попробуйте позже.';
        return fallback;
    }
  }

  if (error && typeof error === 'object' && (error as { name?: string }).name === 'TimeoutError') {
    return 'Сервер не ответил вовремя. Попробуйте ещё раз.';
  }

  return (error as { message?: string })?.message ?? fallback;
}
