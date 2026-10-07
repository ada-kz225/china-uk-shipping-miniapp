import type { SqliteDatabase } from "../db/database.js";
import type { Address } from "../domain/index.js";
import { createId, nowIso } from "../utils/identifiers.js";

export type CreateAddressInput = {
  userId: string;
  recipientName: string;
  phone: string;
  postcode: string;
  addressLine: string;
};

const addressFields = [
  "id",
  "user_id AS userId",
  "recipient_name AS recipientName",
  "phone",
  "postcode",
  "address_line AS addressLine",
  "created_at AS createdAt",
  "updated_at AS updatedAt"
].join(", ");

export class AddressRepository {
  constructor(private readonly database: SqliteDatabase) {}

  create(input: CreateAddressInput): Address {
    const id = createId();
    const timestamp = nowIso();

    this.database
      .prepare(
        [
          "INSERT INTO addresses (",
          "id, user_id, recipient_name, phone, postcode, address_line, created_at, updated_at",
          ") VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .run(
        id,
        input.userId,
        input.recipientName,
        input.phone,
        input.postcode,
        input.addressLine,
        timestamp,
        timestamp
      );

    return this.findById(id) as Address;
  }

  findById(id: string): Address | undefined {
    return this.database
      .prepare("SELECT " + addressFields + " FROM addresses WHERE id = ?")
      .get(id) as Address | undefined;
  }
}
