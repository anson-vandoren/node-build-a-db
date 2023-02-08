import { Statement, StatementType } from "./commands";
import { Row } from "./row";
import { Table } from "./table";
import { Cursor } from "./cursor";
import { LeafNode } from "./node";

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
  const node = table.pager.getLeafNode(table.rootPageNum);
  if (node.numCells >= LeafNode.MAX_CELLS) {
    console.log("Error: Table full.");
    return;
  }
  const rowToInsert = statement.rowToInsert;
  const cursor = Cursor.fromEnd(table);
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
