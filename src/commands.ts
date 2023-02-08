import { Row } from "./row";
import { Database } from "./database";

export enum StatementType {
  STATEMENT_INSERT,
  STATEMENT_SELECT,
}

export interface Statement {
  type: StatementType;
  rowToInsert?: Row;
}

export function doMetaCommand(command: string, db: Database): void {
  if (command === ".exit") {
    db.close();
    process.exit(0);
  } else {
    throw new Error("Unrecognized command '" + command + "'.");
  }
}

export function prepareStatement(command: string): Statement {
  const tokens = command.split(" ");
  if (tokens[0] === "insert") {
    if (tokens.length !== 4) {
      throw new Error("Syntax error. Usage: insert <id> <username> <email>");
    }
    const [ _cmd, id, username, email ] = tokens;
    const row = new Row(id, username, email);
    return {
      type: StatementType.STATEMENT_INSERT,
      rowToInsert: row,
    };
  }

  if (tokens[0] === "select") {
    return {
      type: StatementType.STATEMENT_SELECT,
    };
  }

  throw new Error("Unrecognized keyword at start of '" + command + "'.");
}
