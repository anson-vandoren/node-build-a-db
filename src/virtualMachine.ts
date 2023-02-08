import { Statement, StatementType } from "./commands";
import { Row } from "./row";
import { Table, TABLE_MAX_ROWS } from "./table";
import { Cursor } from "./cursor";

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
  const cursor = Cursor.fromEnd(table);
  const { page, offset } = cursor.value();
  rowToInsert.serialize(page, offset);
  table.numRows += 1;
}

function executeSelect(_statement: Statement, table: Table): void {
  const cursor = Cursor.fromStart(table);
  while (!cursor.endOfTable) {
    const { page, offset } = cursor.value();
    const row = Row.deserialize(page, offset);
    console.log(row.toString());
    cursor.advance();
  }
}
