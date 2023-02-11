
const COLUMN_USERNAME_SIZE = 32;
const COLUMN_EMAIL_SIZE = 255;
const ID_SIZE = 4;
const maxId = 2 ** (ID_SIZE * 8) - 1;
const ID_OFFSET = 0;
const USERNAME_OFFSET = ID_OFFSET + ID_SIZE;
const EMAIL_OFFSET = USERNAME_OFFSET + COLUMN_USERNAME_SIZE;
export const ROW_SIZE = ID_SIZE + COLUMN_USERNAME_SIZE + COLUMN_EMAIL_SIZE;

export class Row {
  static readonly SIZE = ROW_SIZE;
  id: number;
  username: string;
  email: string;

  constructor(id: number | string, username: string, email: string) {
    if (typeof id === "string") {
      id = +id;
      if (Number.isNaN(id)) {
        throw new Error("ID must be a number");
      }
    }
    if (typeof id !== "number") {
      throw new Error("ID must be a number");
    }
    if (typeof username !== "string") {
      throw new Error("Username must be a string");
    }
    if (typeof email !== "string") {
      throw new Error("Email must be a string");
    }

    if (username.length > COLUMN_USERNAME_SIZE) {
      throw new Error("Username too long");
    }
    if (email.length > COLUMN_EMAIL_SIZE) {
      throw new Error("Email too long");
    }
    if (id < 0) {
      throw new Error("ID must be positive");
    }
    // make sure number is 4 bytes
    if (id > maxId) {
      throw new Error("ID too large");
    }
    this.id = id;
    this.username = username;
    this.email = email;
  }

  public serialize(destination: Buffer, offset: number): void {
    destination.writeInt32BE(this.id, offset + ID_OFFSET);
    offset += ID_SIZE;
    destination.write(this.username, offset, COLUMN_USERNAME_SIZE, "ascii");
    offset += COLUMN_USERNAME_SIZE;
    destination.write(this.email, offset, COLUMN_EMAIL_SIZE, "ascii");
  }

  public static deserialize(buffer: Buffer, offset: number): Row {
    const id = buffer.readInt32BE(offset + ID_OFFSET);
    offset += ID_SIZE;
    const username = buffer.toString("ascii", offset, offset + COLUMN_USERNAME_SIZE);
    offset += COLUMN_USERNAME_SIZE;
    const email = buffer.toString("ascii", offset, offset + COLUMN_EMAIL_SIZE);
    return new Row(id, username, email);
  }

  toString(): string {
    return `(${this.id}, ${this.username}, ${this.email})`;
  }
}
