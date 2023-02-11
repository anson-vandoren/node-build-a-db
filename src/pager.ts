import fs from "fs";
import { InternalNode, LeafNode, Node } from "./node";
import { Table } from "./table";

export const PAGE_SIZE = 4096;

export class Pager {
  private fileDescriptor: number;
  private fileLength: number;
  private pages: Buffer[] = [];
  public numPages: number;

  constructor(filename: string) {
    let size: number;
    try {
      this.fileDescriptor = fs.openSync(filename, "r+");
      size = fs.fstatSync(this.fileDescriptor).size;
    } catch (e: any) {
      if (e.code === "ENOENT") {
        this.fileDescriptor = fs.openSync(filename, "w+");
        size = 0;
      } else {
        throw e;
      }
    }
    this.fileLength = size;
    this.numPages = Math.floor(size / PAGE_SIZE);
    if (size % PAGE_SIZE) {
      throw new Error(`DB file is not a whole number of pages. Corrupt file.`);
    }
  }

  public getPage(pageNum: number): Buffer {
    const maxPages = Table.MAX_PAGES;
    if (pageNum > maxPages) {
      throw new Error(`OOB page number ${pageNum}: max ${maxPages}`);
    }
    if (!this.pages[pageNum]) {
      const page = Buffer.alloc(PAGE_SIZE);
      let numPages = Math.ceil(this.fileLength / PAGE_SIZE);

      // might save a partial page at the end of the file
      if (this.fileLength % PAGE_SIZE) {
        numPages += 1;
      }

      if (pageNum <= numPages) {
        const offset = pageNum * PAGE_SIZE;
        const bytesRead = fs.readSync(this.fileDescriptor, page, 0, PAGE_SIZE, offset);
        if (bytesRead < 0) {
          throw new Error(`Error reading file: ${bytesRead}`);
        }
      }
      this.pages[pageNum] = page;
      if (pageNum >= this.numPages) {
        this.numPages = pageNum + 1;
      }
    }
    return this.pages[pageNum];
  }

  public getLeafNode(pageNum: number, forceCreate = false): LeafNode {
    const page = this.getPage(pageNum);
    const isLeaf = Node.isLeaf(page);
    if (!isLeaf && !forceCreate) {
      throw new Error(`Tried to fetch leaf node from internal node ${pageNum}`);
    }
    return new LeafNode(page);
  }

  public getInternalNode(pageNum: number): InternalNode {
    const page = this.getPage(pageNum);
    if (Node.isLeaf(page)) {
      throw new Error(`Tried to fetch internal node from leaf node ${pageNum}`);
    }
    return new InternalNode(page);
  }

  public close(): void {
    for (let i = 0; i < this.numPages; i++) {
      this.flushPage(i);
    }

    fs.closeSync(this.fileDescriptor);
    this.pages = [];
  }

  public getUnusedPageNum(): number {
    // TODO: recycling pages
    return this.numPages;
  }

  private flushPage(pageNum: number): void {
    if (!this.pages[pageNum]) {
      return;
    }
    const offset = pageNum * PAGE_SIZE;
    const bytesWritten = fs.writeSync(
      this.fileDescriptor,
      this.pages[pageNum],
      0,
      PAGE_SIZE,
      offset
    );
    if (bytesWritten < 0) {
      throw new Error(`Error writing file: ${bytesWritten}`);
    }
  }
}
