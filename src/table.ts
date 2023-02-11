import { ROW_SIZE } from "./row";
import { Pager, PAGE_SIZE } from "./pager";
import { NodeType } from "./node";

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
      const rootNode = this.pager.getLeafNode(0, true);
      rootNode.initialize();
      rootNode.isRoot = true;
    }
  }

  public close(): void {
    this.pager.close();
  }

  public createNewRoot(rightChildPageNum: number): void {
    const oldRoot = this.pager.getLeafNode(this.rootPageNum);
    // const rightChild = this.pager.getLeafNode(rightChildPageNum);
    const leftChildPageNum = this.pager.getUnusedPageNum();
    const leftChild = this.pager.getLeafNode(leftChildPageNum, true);
    leftChild.copyFrom(oldRoot);
    leftChild.isRoot = false;

    // now, root should switch to internal
    oldRoot.nodeType = NodeType.INTERNAL;
    const newRoot = this.pager.getInternalNode(this.rootPageNum);
    
    newRoot.initialize();
    newRoot.isRoot = true;
    newRoot.numKeys = 1;
    newRoot.setChild(0, leftChildPageNum);
    const leftChildMaxKey = leftChild.getMaxKey();
    newRoot.setKey(0, leftChildMaxKey);
    newRoot.rightChild = rightChildPageNum;
  }
}
