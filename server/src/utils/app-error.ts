export type FieldError = {
  field: string;
  message: string;
};

export class AppError extends Error {
  constructor(
    public readonly code:
      | "INVALID_INPUT"
      | "DUPLICATE_TRACKING_NUMBER"
      | "PACKAGE_NOT_FOUND"
      | "FORBIDDEN"
      | "INVALID_STATE_TRANSITION",
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors: FieldError[] = []
  ) {
    super(message);
    this.name = "AppError";
  }
}
