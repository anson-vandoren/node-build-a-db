import { Table } from "./table";
import { InternalNode, LeafNode, NodeType, Node } from "./node";

export class Cursor {
  public table: Table;
  private _pageNum: number;
  private _cellNum: number;
  public endOfTable: boolean;

  public get pageNum(): number {
    return this._pageNum;
  }

  public get cellNum(): number {
    return this._cellNum;
  }

  public set cellNum(cellNum: number) {
    this._cellNum = cellNum;
    const node = this.table.pager.getLeafNode(this._pageNum);
    this.endOfTable = cellNum >= node.numCells;
  }

  constructor(table: Table, pageNum: number, cellNum: number, endOfTable = false) {
    this.table = table;
    this._pageNum = pageNum;
    this._cellNum = cellNum;
    this.endOfTable = endOfTable;
  }

  public value(): { page: Buffer; offset: number } {
    let page = this.table.pager.getPage(this._pageNum);
    const node = new LeafNode(page);
    const offset = node.getValueOffset(this.cellNum);
    // TODO: refactor this so callers don't need a page and offset
    return { page, offset };
  }

  public advance(): void {
    const node = this.table.pager.getLeafNode(this._pageNum);
    this.cellNum += 1;
    if (this.cellNum >= node.numCells) {
      const nextPageNum = node.nextLeaf;
      if (nextPageNum === 0) {
        // rightmost leaf
        this.endOfTable = true;
      } else {
        this._pageNum = nextPageNum;
        this.cellNum = 0;
      }
    }
  }

  public static fromStart(table: Table): Cursor {
    const cursor = Cursor.tableFind(table, 0);

    const node = table.pager.getLeafNode(cursor._pageNum);
    cursor.endOfTable = node.numCells === 0;

    return cursor;
  }

  /**
   * Find the position of the given key. If the key is not present, return
   * the position where it should be inserted.
   */
  public static tableFind(table: Table, key: number): Cursor {
    const rootPageNum = table.rootPageNum;
    const rootPage = table.pager.getPage(rootPageNum);
    const isLeaf = Node.isLeaf(rootPage);

    if (isLeaf) {
      const rootNode = new LeafNode(rootPage);
      const cursor = new Cursor(table, rootPageNum, 0, false);
      return rootNode.find(cursor, key);
    } else {
      return Cursor.internalNodeFind(table, rootPageNum, key);
    }
  }

  /**
   * Return the index of the child which should contain the given key.
   * @param table 
   * @param pageNum 
   * @param key 
   * @returns 
   */
  private static internalNodeFind(table: Table, pageNum: number, key: number): Cursor {
    const node = table.pager.getInternalNode(pageNum);

    const childIdx = node.findChild(key);
    const childNum = node.getChildPage(childIdx);

    const child = table.pager.getLeafNode(childNum);
    switch (child.nodeType) {
      case NodeType.LEAF:
        return child.find(new Cursor(table, childNum, 0, false), key);
      case NodeType.INTERNAL:
        return Cursor.internalNodeFind(table, childNum, key);
    }
  }
}
