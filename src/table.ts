import { ROW_SIZE } from "./row";

const PAGE_SIZE = 4096;
const TABLE_MAX_PAGES = 100;
const ROWS_PER_PAGE = Math.floor(PAGE_SIZE / ROW_SIZE);
export const TABLE_MAX_ROWS = Math.floor(ROWS_PER_PAGE * TABLE_MAX_PAGES);

export class Table {
  pages: Buffer[] = [];
  numRows = 0;

  constructor() { }

  public rowSlot(rowNum: number): { page: Buffer, offset: number } {
    const pageNum = Math.floor(rowNum / ROWS_PER_PAGE);
    let page = this.pages[pageNum];
    if (!page) {
      page = Buffer.alloc(PAGE_SIZE);
      this.pages[pageNum] = page;
    }
    const rowOffset = rowNum % ROWS_PER_PAGE;
    const byteOffset = rowOffset * ROW_SIZE;
    return { page, offset: byteOffset };
  }
}
