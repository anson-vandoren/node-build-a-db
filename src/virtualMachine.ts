import { Statement, StatementType } from "./commands";
import { Row } from "./row";
import { Table, TABLE_MAX_ROWS } from "./table";

export function executeStatement(statement: Statement, table: Table): void {
  switch (statement.type) {
    case StatementType.STATEMENT_INSERT:
      executeInsert(statement, table);
      break;
    case StatementType.STATEMENT_SELECT:
      executeSelect(statement, table);
      break;
  }
}

function executeInsert(statement: Statement, table: Table): void {
  if (!statement.rowToInsert) {
    throw new Error("No row to insert");
  }
  if (table.numRows >= TABLE_MAX_ROWS) {
    console.log("Error: Table full.");
    return;
  }
  const rowToInsert = statement.rowToInsert;
  const { page, offset } = table.rowSlot(table.numRows);
  rowToInsert.serialize(page, offset);
  table.numRows += 1;
}

function executeSelect(_statement: Statement, table: Table): void {
  for (let i = 0; i < table.numRows; i++) {
    const { page, offset } = table.rowSlot(i);
    const row = Row.deserialize(page, offset);
    console.log(row.toString());
  }
}
