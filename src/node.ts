import { PAGE_SIZE } from "./pager";
import { ROW_SIZE, Row } from "./row";
import { Cursor } from "./cursor";
import { Table } from "./table";


export enum NodeType {
  INTERNAL = 0,
  LEAF,
}

/**
 * Common Node Header Layout
 */
const NODE_TYPE_SIZE = 1;
const NODE_TYPE_OFFSET = 0;
const IS_ROOT_SIZE = 1;
const IS_ROOT_OFFSET = NODE_TYPE_SIZE + NODE_TYPE_OFFSET;
const PARENT_POINTER_SIZE = 4;
const PARENT_POINTER_OFFSET = IS_ROOT_OFFSET + IS_ROOT_SIZE;
const COMMON_NODE_HEADER_SIZE = NODE_TYPE_SIZE + IS_ROOT_SIZE + PARENT_POINTER_SIZE;

/**
 * Leaf Node Header Layout
 */
const LEAF_NODE_NUM_CELLS_SIZE = 4;
const LEAF_NODE_NUM_CELLS_OFFSET = COMMON_NODE_HEADER_SIZE;
const LEAF_NODE_HEADER_SIZE = COMMON_NODE_HEADER_SIZE + LEAF_NODE_NUM_CELLS_SIZE;

/**
  * Leaf Node Body Layout
  */
const LEAF_NODE_KEY_SIZE = 4;
const LEAF_NODE_KEY_OFFSET = 0;
const LEAF_NODE_VALUE_SIZE = ROW_SIZE;
const LEAF_NODE_VALUE_OFFSET = LEAF_NODE_KEY_OFFSET + LEAF_NODE_KEY_SIZE;
const LEAF_NODE_CELL_SIZE = LEAF_NODE_KEY_SIZE + LEAF_NODE_VALUE_SIZE;
const LEAF_NODE_SPACE_FOR_CELLS = PAGE_SIZE - LEAF_NODE_HEADER_SIZE;
const LEAF_NODE_MAX_CELLS = Math.floor(LEAF_NODE_SPACE_FOR_CELLS / LEAF_NODE_CELL_SIZE);

export class Node {
  protected page: Buffer;

  public get nodeType(): NodeType {
    return this.page.readUInt8(NODE_TYPE_OFFSET) as NodeType;
  }

  public set nodeType(nodeType: NodeType) {
    this.page.writeUInt8(nodeType, NODE_TYPE_OFFSET);
  }

  public get isRoot(): boolean {
    return this.page.readUInt8(IS_ROOT_OFFSET) === 1;
  }

  public set isRoot(isRoot: boolean) {
    this.page.writeUInt8(isRoot ? 1 : 0, IS_ROOT_OFFSET);
  }

  public get parent(): number {
    return this.page.readUInt32BE(PARENT_POINTER_OFFSET);
  }

  public set parent(parent: number) {
    this.page.writeUInt32BE(parent, PARENT_POINTER_OFFSET);
  }

  constructor(page: Buffer) {
    this.page = page;
  }

}

export class LeafNode extends Node {
  static readonly MAX_CELLS = LEAF_NODE_MAX_CELLS;
  public get numCells(): number {
    const numCells = this.page.readUInt32BE(LEAF_NODE_NUM_CELLS_OFFSET);
    return numCells;
  }

  public set numCells(numCells: number) {
    this.page.writeUInt32BE(numCells, LEAF_NODE_NUM_CELLS_OFFSET);
  }

  public initializeRoot(): void {
    this.numCells = 0;
    this.nodeType = NodeType.LEAF;
  }

  public getCellOffset(cellNum: number): number {
    const offset = LEAF_NODE_HEADER_SIZE + cellNum * LEAF_NODE_CELL_SIZE;
    return offset;
  }

  public getKeyOffset(cellNum: number): number {
    return this.getCellOffset(cellNum);
  }

  public getKey(cellNum: number): number {
    return this.page.readUInt32BE(this.getKeyOffset(cellNum));
  }

  private setKey(cellNum: number, key: number): void {
    this.page.writeUInt32BE(key, this.getKeyOffset(cellNum));
  }

  public getValueOffset(cellNum: number): number {
    return this.getCellOffset(cellNum) + LEAF_NODE_KEY_SIZE;
  }

  public insert(cursor: Cursor, key: number, row: Row): void {
    if (this.numCells >= LEAF_NODE_MAX_CELLS) {
      throw new Error("Need to implement splitting a leaf node.");
    }

    if (cursor.cellNum < this.numCells) {
      // make room for new cell by shifting cells to the right
      for (let i = this.numCells; i > cursor.cellNum; i--) {
        this.page.copyWithin(this.getCellOffset(i), this.getCellOffset(i - 1), this.getCellOffset(i - 1) + LEAF_NODE_CELL_SIZE);
      }
    }
    
    this.numCells += 1;
    this.setKey(cursor.cellNum, key);
    const rowOffset = this.getValueOffset(cursor.cellNum);
    row.serialize(this.page, rowOffset);
  }

  public find(cursor: Cursor, key: number): Cursor {
    const numCells = this.numCells;

    // binary search
    let minIndex = 0;
    let onePastMaxIndex = numCells;
    while (onePastMaxIndex !== minIndex) {
      const index = Math.floor((onePastMaxIndex + minIndex) / 2);
      const keyAtIndex = this.getKey(index);
      if (key === keyAtIndex) {
        cursor.cellNum = index;
        return cursor;
      }
      if (key < keyAtIndex) {
        onePastMaxIndex = index;
      } else {
        minIndex = index + 1;
      }
    }
    cursor.cellNum = minIndex;
    return cursor;
  }
}

