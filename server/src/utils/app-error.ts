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
      | "PACKAGE_NOT_ELIGIBLE"
      | "SHIPMENT_NOT_FOUND"
      | "FORBIDDEN"
      | "INVALID_STATE_TRANSITION"
      | "INVALID_SHIPMENT_STATE"
      | "QUOTE_NOT_READY"
      | "QUOTE_ALREADY_EXISTS"
      | "INVALID_WEIGHT"
      | "INVALID_AMOUNT"
      | "PAYMENT_ALREADY_COMPLETED"
      | "PAYMENT_FAILED",
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors: FieldError[] = []
  ) {
    super(message);
    this.name = "AppError";
  }
}
