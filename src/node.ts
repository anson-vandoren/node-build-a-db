import { PAGE_SIZE } from "./pager";
import { ROW_SIZE, Row } from "./row";
import { Cursor } from "./cursor";
import { Table } from "./table";

const debug = console.debug

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
const LEAF_NODE_NEXT_LEAF_SIZE = 4;
const LEAF_NODE_NEXT_LEAF_OFFSET = LEAF_NODE_NUM_CELLS_OFFSET + LEAF_NODE_NUM_CELLS_SIZE;
const LEAF_NODE_HEADER_SIZE = COMMON_NODE_HEADER_SIZE + LEAF_NODE_NUM_CELLS_SIZE + LEAF_NODE_NEXT_LEAF_SIZE;

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

const LEAF_NODE_RIGHT_SPLIT_COUNT = Math.floor((LEAF_NODE_MAX_CELLS + 1) / 2);
const LEAF_NODE_LEFT_SPLIT_COUNT = (LEAF_NODE_MAX_CELLS + 1) - LEAF_NODE_RIGHT_SPLIT_COUNT;

/**
 * Internal Node Header Layout
 */
const INTERNAL_NODE_NUM_KEYS_SIZE = 4;
const INTERNAL_NODE_NUM_KEYS_OFFSET = COMMON_NODE_HEADER_SIZE;
const INTERNAL_NODE_RIGHT_CHILD_SIZE = 4;
const INTERNAL_NODE_RIGHT_CHILD_OFFSET = INTERNAL_NODE_NUM_KEYS_OFFSET + INTERNAL_NODE_NUM_KEYS_SIZE;
const INTERNAL_NODE_HEADER_SIZE = COMMON_NODE_HEADER_SIZE + INTERNAL_NODE_NUM_KEYS_SIZE + INTERNAL_NODE_RIGHT_CHILD_SIZE;

/**
 * Internal Node Body Layout
 */
const INTERNAL_NODE_KEY_SIZE = 4;
const INTERNAL_NODE_CHILD_SIZE = 4;
const INTERNAL_NODE_CELL_SIZE = INTERNAL_NODE_KEY_SIZE + INTERNAL_NODE_CHILD_SIZE;
const INTERNAL_NODE_MAX_CELLS = 3; // small for testing

export class Node {
  static readonly COMMON_HEADER_SIZE = COMMON_NODE_HEADER_SIZE;
  protected page: Buffer;

  public get buf(): Buffer {
    return this.page;
  }

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

  public static isLeaf(page: Buffer): boolean {
    return page.readUInt8(NODE_TYPE_OFFSET) === NodeType.LEAF;
  }

  public static isInternal(page: Buffer): boolean {
    return page.readUInt8(NODE_TYPE_OFFSET) === NodeType.INTERNAL;
  }

  constructor(page: Buffer) {
    this.page = page;
  }

  public copyFrom(source: Node): void {
    source.page.copy(this.page, 0, 0, PAGE_SIZE);
  }

  public initialize(): void {
    throw new Error("Not implemented");
  }

  public getMaxKey(): number {
    // TODO: consolidation
    throw new Error("Not implemented");
  }

  public static getNodeType(page: Buffer): NodeType {
    return page.readUInt8(NODE_TYPE_OFFSET) as NodeType;
  }

  public static setNodeType(page: Buffer, nodeType: NodeType): void {
    page.writeUInt8(nodeType, NODE_TYPE_OFFSET);
  }
}

export class InternalNode extends Node {

  public get numKeys(): number {
    return this.page.readUInt32BE(INTERNAL_NODE_NUM_KEYS_OFFSET);
  }

  public set numKeys(numKeys: number) {
    this.page.writeUInt32BE(numKeys, INTERNAL_NODE_NUM_KEYS_OFFSET);
  }

  public get rightChild(): number {
    return this.page.readUInt32BE(INTERNAL_NODE_RIGHT_CHILD_OFFSET);
  }

  public set rightChild(pageNum: number) {
    this.page.writeUInt32BE(pageNum, INTERNAL_NODE_RIGHT_CHILD_OFFSET);
  }

  constructor(from: Buffer | Node) {
    if (from instanceof Node) {
      super(from.buf);
    } else {
      super(from);
    }
  }

  public setKey(childIdx: number, key: number): void {
    const numKeys = this.numKeys;
    if (childIdx > numKeys) {
      throw new Error(`Tried to access keyNum ${childIdx} > numKeys ${numKeys}`);
    }
    this.page.writeUInt32BE(key, this.getCellOffset(childIdx) + INTERNAL_NODE_CHILD_SIZE);
  }

  public getKey(childIdx: number): number {
    const numKeys = this.numKeys;
    if (childIdx > numKeys) {
      throw new Error(`Tried to access keyNum ${childIdx} > numKeys ${numKeys}`);
    }
    return this.page.readUInt32BE(this.getCellOffset(childIdx) + INTERNAL_NODE_CHILD_SIZE);
  }

  public updateKey(oldKey: number, newKey: number): void {
    const oldChildIdx = this.findChild(oldKey);
    this.setKey(oldChildIdx, newKey);
  }

  public getChildPage(childIdx: number): number {
    const numKeys = this.numKeys;
    if (childIdx > numKeys) {
      throw new Error(`Tried to access childNum ${childIdx} > numKeys ${numKeys}`);
    } else if (childIdx === numKeys) {
      return this.rightChild;
    } else {
      // for each childNum, 4 bytes for the child pointer then 4 bytes for the key
      return this.page.readUInt32BE(this.getCellOffset(childIdx));
    }
  }

  public setChildPage(childIdx: number, childPage: number): void {
    const numKeys = this.numKeys;
    if (childIdx > numKeys) {
      throw new Error(`Tried to access childNum ${childIdx} > numKeys ${numKeys}`);
    } else if (childIdx === numKeys) {
      this.rightChild = childPage;
    } else {
      // for each childNum, 4 bytes for the child pointer then 4 bytes for the key
      this.page.writeUInt32BE(childPage, this.getCellOffset(childIdx));
    }
  }

  private getCellOffset(cellNum: number): number {
    return INTERNAL_NODE_HEADER_SIZE + cellNum * INTERNAL_NODE_CELL_SIZE;
  }

  public getMaxKey(): number {
    return this.getKey(this.numKeys - 1);
  }

  public initialize(): void {
    this.nodeType = NodeType.INTERNAL;
    this.isRoot = false;
    this.numKeys = 0;
  }

  /**
   * Return the index of the child which should contain the given key.
   * @param key key to search for
   */
  public findChild(key: number): number {
    const numKeys = this.numKeys;
    let minIdx = 0;
    let maxIdx = numKeys; // there is one more child than key

    while (minIdx !== maxIdx) {
      const idx = Math.floor((minIdx + maxIdx) / 2);
      const keyToRight = this.getKey(idx);
      if (keyToRight >= key) {
        maxIdx = idx;
      } else {
        minIdx = idx + 1;
      }
    }

    return minIdx;
  }

  public insert(table: Table, parentPageNum: number, childPageNum: number): void {
    const parent = table.pager.getInternalNode(parentPageNum);
    const child = table.pager.getLeafNode(childPageNum);
    const childMaxKey = child.getMaxKey();
    const idx = parent.findChild(childMaxKey);

    const originalNumKeys = parent.numKeys;
    parent.numKeys++;
    if (originalNumKeys >= INTERNAL_NODE_MAX_CELLS) {
      throw new Error("Need to implement splitting internal node");
    }

    const rightChildPageNum = parent.rightChild;
    const rightChild = table.pager.getLeafNode(rightChildPageNum);

    if (childMaxKey > rightChild.getMaxKey()) {
      // replace right child
      parent.setChildPage(originalNumKeys, rightChildPageNum);
      parent.setKey(originalNumKeys, rightChild.getMaxKey());
      parent.rightChild = childPageNum;
    } else {
      // make room for the new cell
      for (let i = originalNumKeys; i > idx; i--) {
        const destination = parent.getCellOffset(i);
        const source = parent.getCellOffset(i - 1);
        parent.page.copyWithin(destination, source, source + INTERNAL_NODE_CELL_SIZE);
      }
      parent.setChildPage(idx, childPageNum);
      parent.setKey(idx, childMaxKey);
    }
  } 
}

export class LeafNode extends Node {
  static readonly MAX_CELLS = LEAF_NODE_MAX_CELLS;
  static readonly HEADER_SIZE = LEAF_NODE_HEADER_SIZE;
  static readonly CELL_SIZE = LEAF_NODE_CELL_SIZE;
  static readonly SPACE_FOR_CELLS = LEAF_NODE_SPACE_FOR_CELLS;

  constructor(from: Buffer | Node) {
    if (from instanceof Node) {
      super(from.buf);
    } else {
      super(from);
    }
  }

  public get numCells(): number {
    const numCells = this.page.readUInt32BE(LEAF_NODE_NUM_CELLS_OFFSET);
    return numCells;
  }

  public set numCells(numCells: number) {
    this.page.writeUInt32BE(numCells, LEAF_NODE_NUM_CELLS_OFFSET);
  }

  public get nextLeaf(): number {
    return this.page.readUInt32BE(LEAF_NODE_NEXT_LEAF_OFFSET);
  }

  public set nextLeaf(nextLeaf: number) {
    this.page.writeUInt32BE(nextLeaf, LEAF_NODE_NEXT_LEAF_OFFSET);
  }

  public initialize(): void {
    this.nodeType = NodeType.LEAF;
    this.isRoot = false;
    this.numCells = 0;
    this.nextLeaf = 0;
  }

  public getCellOffset(cellNum: number): number {
    return LEAF_NODE_HEADER_SIZE + cellNum * LEAF_NODE_CELL_SIZE;
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


  public getMaxKey(): number{
    return this.getKey(this.numCells - 1);
  }

  public getValueOffset(cellNum: number): number {
    return this.getCellOffset(cellNum) + LEAF_NODE_KEY_SIZE;
  }

  public insert(cursor: Cursor, key: number, row: Row): void {
    if (this.numCells >= LEAF_NODE_MAX_CELLS) {
      // node full
      return this.splitAndInsert(cursor, key, row);
    }

    if (cursor.cellNum < this.numCells) {
      // make room for new cell by shifting cells to the right
      for (let i = this.numCells; i > cursor.cellNum; i--) {
        this.page.copyWithin(
          this.getCellOffset(i),
          this.getCellOffset(i - 1),
          this.getCellOffset(i - 1) + LEAF_NODE_CELL_SIZE
        );
      }
    }

    this.numCells += 1;
    this.setKey(cursor.cellNum, key);
    const rowOffset = this.getValueOffset(cursor.cellNum);
    row.serialize(this.page, rowOffset);
  }

  /**
   * Create a new node and move half the cells over.
   * Insert the new value in one of the two nodes.
   * Update parent or create a new parent.
   */
  private splitAndInsert(cursor: Cursor, key: number, row: Row): void {
    const oldMaxKey = this.getMaxKey();
    const { pageNum: newPageNum, node: newNode } = cursor.table.pager.getNewLeafNode();
    newNode.parent = this.parent;
    newNode.nextLeaf = this.nextLeaf;
    this.nextLeaf = newPageNum;

    // All existing keys plus new key should be divided
    // evenly between old (left) and new (right) nodes.
    // Starting from the right, move each key to correct position.
    for (let i = LEAF_NODE_MAX_CELLS; i >= 0; i--) {
      const destinationNode = i >= LEAF_NODE_LEFT_SPLIT_COUNT ? newNode : this;
      const indexWithinNode = i % LEAF_NODE_LEFT_SPLIT_COUNT;
      const destCell = destinationNode.getCellOffset(indexWithinNode);

      if (i === cursor.cellNum) {
        destinationNode.setKey(indexWithinNode, key);
        row.serialize(destinationNode.page, destinationNode.getValueOffset(indexWithinNode));
      } else if (i > cursor.cellNum) {
        this.page.copy(destinationNode.page, destCell, this.getCellOffset(i - 1), LEAF_NODE_CELL_SIZE);
      } else {
        const sourceStart = this.getCellOffset(i);
        const sourceEnd = sourceStart + LEAF_NODE_CELL_SIZE;
        this.page.copy(destinationNode.page, destCell, sourceStart, sourceEnd);
      }
    }
    this.numCells = LEAF_NODE_LEFT_SPLIT_COUNT;
    newNode.numCells = LEAF_NODE_RIGHT_SPLIT_COUNT;

    if (this.isRoot) {
      return cursor.table.createNewRoot(newPageNum);
    } else {
      const parentPageNum = this.parent;
      const newMaxKey = this.getMaxKey();
      const parent = cursor.table.pager.getInternalNode(parentPageNum);

      parent.updateKey(oldMaxKey, newMaxKey);
      parent.insert(cursor.table, parentPageNum, newPageNum);
    }
  }

  public find(cursor: Cursor, key: number): Cursor {
    // binary search
    let minIndex = 0;
    let onePastMaxIndex = this.numCells;
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
