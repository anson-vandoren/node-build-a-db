export enum StatementType {
  STATEMENT_INSERT,
  STATEMENT_SELECT,
};

export interface Statement {
  type: StatementType;
};

export function doMetaCommand(command: string): void {
  if (command === ".exit") {
    process.exit(0);
  } else {
    throw new Error("Unrecognized command '" + command + "'.");
  }
}

export function prepareStatement(command: string): Statement {
  if (command.startsWith("insert")) {
    return {
      type: StatementType.STATEMENT_INSERT,
    };
  }

  if (command.startsWith("select")) {
    return {
      type: StatementType.STATEMENT_SELECT,
    };
  }

  throw new Error("Unrecognized keyword at start of '" + command + "'.");
}
