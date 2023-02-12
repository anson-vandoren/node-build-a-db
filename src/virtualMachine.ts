import { Statement, StatementType } from "./commands";
import { Row } from "./row";
import { Table } from "./table";
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

  const rowToInsert = statement.rowToInsert;
  const keyToInsert = rowToInsert.id;
  const cursor = Cursor.tableFind(table, keyToInsert);

  const node = table.pager.getLeafNode(cursor.pageNum);
  const numCells = node.numCells;

  if (cursor.cellNum < numCells) {
    const keyAtIndex = node.getKey(cursor.cellNum);
    if (keyAtIndex === keyToInsert) {
      console.log("Error: Duplicate key.");
      return;
    }
  }

  node.insert(cursor, rowToInsert.id, rowToInsert);
}

function executeSelect(_statement: Statement, table: Table): void {
  const cursor = Cursor.fromStart(table);
  while (!cursor.endOfTable) {
    const { page, offset } = cursor.value();
    const row = Row.deserialize(page, offset);
    cursor.advance();
    console.log(row.toString());
  }
}
