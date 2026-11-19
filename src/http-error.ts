// Throw this from a route to send a specific status and message.
// Express 5 forwards errors thrown in async handlers to the error handler.
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
