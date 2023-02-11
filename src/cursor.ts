import { Table } from "./table";
import { LeafNode, NodeType, Node } from "./node";

export class Cursor {
  public table: Table;
  private pageNum: number;
  private _cellNum: number;
  public endOfTable: boolean;

  public get cellNum(): number {
    return this._cellNum;
  }

  public set cellNum(cellNum: number) {
    this._cellNum = cellNum;
    const node = this.table.pager.getLeafNode(this.pageNum);
    this.endOfTable = cellNum >= node.numCells;
  }

  constructor(table: Table, pageNum: number, cellNum: number, endOfTable = false) {
    this.table = table;
    this.pageNum = pageNum;
    this._cellNum = cellNum;
    this.endOfTable = endOfTable;
  }

  public value(): { page: Buffer; offset: number } {
    let page = this.table.pager.getPage(this.pageNum);
    const node = new LeafNode(page);
    const offset = node.getValueOffset(this.cellNum);
    // TODO: refactor this so callers don't need a page and offset
    return { page, offset };
  }

  public advance(): void {
    const node = this.table.pager.getLeafNode(this.pageNum);
    this.cellNum += 1;
    if (this.cellNum >= node.numCells) {
      this.endOfTable = true;
    }
  }

  public static fromStart(table: Table): Cursor {
    const pageNum = table.rootPageNum;
    const cellNum = 0;

    let endOfTable = false;
    const rootPage = table.pager.getPage(pageNum);
    if (Node.nodeType(rootPage) === NodeType.LEAF) {
      const rootNode = table.pager.getLeafNode(pageNum);
      const numCells = rootNode.numCells;
      endOfTable = numCells === 0;
    }
    return new Cursor(table, pageNum, cellNum, endOfTable);
  }

  /**
   * Find the position of the given key. If the key is not present, return
   * the position where it should be inserted.
   */
  public static tableFind(table: Table, key: number): Cursor {
    const rootPageNum = table.rootPageNum;
    const rootNode = table.pager.getLeafNode(rootPageNum);

    if (rootNode.nodeType === NodeType.LEAF) {
      const cursor = new Cursor(table, rootPageNum, 0, false);
      return rootNode.find(cursor, key);
    } else {
      throw new Error("Need to implement searching an internal node");
    }
  }
}
