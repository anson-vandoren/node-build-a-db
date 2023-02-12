import { Row } from "./row";
import { Database } from "./database";
import { InternalNode, LeafNode, Node, NodeType } from "./node";
import { Pager } from "./pager";
import { executeStatement } from "./virtualMachine";

export enum StatementType {
  STATEMENT_INSERT,
  STATEMENT_SELECT,
}

export interface Statement {
  type: StatementType;
  rowToInsert?: Row;
}

export function doMetaCommand(command: string, db: Database): void {
  switch (command) {
    case ".exit":
      db.close();
      process.exit(0);
      break;
    case ".constants":
      printConstants();
      break;
    case ".btree":
      printTree(db.table.pager, db.table.rootPageNum, 1);
      break;
    case ".insert20":
      insert(20, db);
      break;
    case ".insert13":
      insert(13, db);
      break;
    default:
      throw new Error("Unrecognized command '" + command + "'.");
  }
}

function insert(numRows: number, db: Database): void {
  for (let i = 0; i < numRows; i++) {
    const row = new Row(i, `User ${i}`, 'smth@smth.com');
    const statement: Statement = {
      type: StatementType.STATEMENT_INSERT,
      rowToInsert: row,
    };
    executeStatement(statement, db.table);
  }
}

function printConstants(): void {
  console.log(`ROW_SIZE: ${Row.SIZE}`);
  console.log(`COMMON_NODE_HEADER_SIZE: ${Node.COMMON_HEADER_SIZE}`);
  console.log(`LEAF_NODE_HEADER_SIZE: ${LeafNode.HEADER_SIZE}`);
  console.log(`LEAF_NODE_CELL_SIZE: ${LeafNode.CELL_SIZE}`);
  console.log(`LEAF_NODE_SPACE_FOR_CELLS: ${LeafNode.SPACE_FOR_CELLS}`);
  console.log(`LEAF_NODE_MAX_CELLS: ${LeafNode.MAX_CELLS}`);
}

function printTree(pager: Pager, pageNum: number, indentLevel: number): void {
  const page = pager.getPage(pageNum);
  const nodeType = Node.getNodeType(page);

  let node: LeafNode | InternalNode;
  switch (nodeType) {
    case NodeType.LEAF:
      node = new LeafNode(page);
      console.log(" ".repeat(indentLevel) + `- leaf (size ${node.numCells})`);
      for (let i = 0; i < node.numCells; i++) {
        console.log(" ".repeat(indentLevel + 1) + `- ${node.getKey(i)}`);
      }
      break;
    case NodeType.INTERNAL:
      node = new InternalNode(page);
      console.log(" ".repeat(indentLevel) + `- internal (size ${node.numKeys})`);
      for (let i = 0; i < node.numKeys; i++) {
        const child = node.getChildPage(i);
        console.log(" ".repeat(indentLevel + 1) + `- child ${child}`);
        printTree(pager, child, indentLevel + 1);
        console.log(" ".repeat(indentLevel + 1) + `- key ${node.getKey(i)}`);
      }
      printTree(pager, node.rightChild, indentLevel + 1);
      console.log(" ".repeat(indentLevel + 1) + `- right child`);
      break;
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
