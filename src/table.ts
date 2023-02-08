import { ROW_SIZE } from "./row";
import { Pager, PAGE_SIZE } from "./pager";

export const TABLE_MAX_PAGES = 100;
export const ROWS_PER_PAGE = Math.floor(PAGE_SIZE / ROW_SIZE);
export const TABLE_MAX_ROWS = Math.floor(ROWS_PER_PAGE * TABLE_MAX_PAGES);

export class Table {
  public pager: Pager;

  public get numRows(): number {
    return this.pager.numRows;
  }

  public set numRows(numRows: number) {
    this.pager.numRows = numRows;
  }

  constructor(pager: Pager) { 
    this.pager = pager;
  }

  public close(): void {
    const numFullPages = Math.floor(this.numRows / ROWS_PER_PAGE);
    this.pager.close(numFullPages);
  }
}
