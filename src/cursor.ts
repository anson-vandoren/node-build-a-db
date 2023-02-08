import { Table } from './table';
import { ROW_SIZE } from './row';
import { ROWS_PER_PAGE } from './table';

export class Cursor {
  private table: Table;
  private rowNum: number;
  public endOfTable: boolean;

  constructor(table: Table, rowNum: number) {
    this.table = table;
    this.rowNum = rowNum;
    this.endOfTable = rowNum >= table.numRows;
  }

  public value(): { page: Buffer, offset: number } {
    const pageNum = Math.floor(this.rowNum / ROWS_PER_PAGE);
    let page = this.table.pager.getPage(pageNum);
    const rowOffset = this.rowNum % ROWS_PER_PAGE;
    const byteOffset = rowOffset * ROW_SIZE;
    return { page, offset: byteOffset };
  }
  
  public advance(): void {
    this.rowNum += 1;
    if (this.rowNum >= this.table.numRows) {
      this.endOfTable = true;
    }
  }

  public static fromStart(table: Table): Cursor {
    return new Cursor(table, 0);
  }

  public static fromEnd(table: Table): Cursor {
    return new Cursor(table, table.numRows);
  }
}
