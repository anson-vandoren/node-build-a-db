import { ROW_SIZE } from "./row";
import { Pager, PAGE_SIZE } from "./pager";

const TABLE_MAX_PAGES = 100;
export const ROWS_PER_PAGE = Math.floor(PAGE_SIZE / ROW_SIZE);
const TABLE_MAX_ROWS = Math.floor(ROWS_PER_PAGE * TABLE_MAX_PAGES);

export class Table {
  static readonly MAX_ROWS = TABLE_MAX_ROWS;
  static readonly MAX_PAGES = TABLE_MAX_PAGES;
  public pager: Pager;
  public rootPageNum: number;

  constructor(pager: Pager) { 
    this.pager = pager;
    this.rootPageNum = 0;

    if (this.pager.numPages === 0) {
      const rootNode = this.pager.getLeafNode(0);
      rootNode.initializeRoot();
    }
  }

  public close(): void {
    this.pager.close();
  }
}
