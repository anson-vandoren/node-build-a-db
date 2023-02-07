import { Statement, StatementType } from "./commands";
export function executeStatement(statement: Statement): void {
  switch (statement.type) {
    case StatementType.STATEMENT_INSERT:
      console.log("This is where we would do an insert.");
      break;
    case StatementType.STATEMENT_SELECT:
      console.log("This is where we would do a select.");
      break;
  }
}
