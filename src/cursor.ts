import { Table } from './table';
import { LeafNode } from './node';

export class Cursor {
  private table: Table;
  private pageNum: number;
  public cellNum: number;
  public endOfTable: boolean;

  constructor(table: Table, pageNum: number, cellNum: number, endOfTable: boolean) {
    this.table = table;
    this.pageNum = pageNum;
    this.cellNum = cellNum;
    this.endOfTable = endOfTable;
  }

  public value(): { page: Buffer, offset: number } {
    let page = this.table.pager.getPage(this.pageNum);
    const node = new LeafNode(page);
    const offset = node.getValueOffset(this.cellNum)
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

    const rootNode = new LeafNode(table.pager.getPage(pageNum));
    const numCells = rootNode.numCells;
    const endOfTable = numCells === 0;
    return new Cursor(table, pageNum, cellNum, endOfTable);
  }

  public static fromEnd(table: Table): Cursor {
    const pageNum = table.rootPageNum;
    const rootNode = table.pager.getLeafNode(pageNum);
    const numCells = rootNode.numCells;
    return new Cursor(table, pageNum, numCells, true);
  }
}
