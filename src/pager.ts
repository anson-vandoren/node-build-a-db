import fs from 'fs';

import { ROW_SIZE } from './row';
import { TABLE_MAX_PAGES } from './table';

export const PAGE_SIZE = 4096;

export class Pager {
  private fileDescriptor: number;
  private fileLength: number;
  public numRows: number;
  private pages: Buffer[] = [];

  constructor(filename: string) {
    let size: number;
    try {
      this.fileDescriptor = fs.openSync(filename, 'r+');
      size = fs.fstatSync(this.fileDescriptor).size;
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        this.fileDescriptor = fs.openSync(filename, 'w+');
        size = 0;
      } else {
        throw e;
      }
    }
    this.numRows = Math.floor(size / ROW_SIZE);
    this.fileLength = size;
  }

  public getPage(pageNum: number): Buffer {
    if (pageNum > TABLE_MAX_PAGES) {
      throw new Error(`OOB page number ${pageNum}: max ${TABLE_MAX_PAGES}`);
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
        const bytesRead = fs.readSync(
          this.fileDescriptor,
          page,
          0,
          PAGE_SIZE,
          offset
        );
        if (bytesRead < 0) {
          throw new Error(`Error reading file: ${bytesRead}`);
        }
      }
      this.pages[pageNum] = page;
    }
    return this.pages[pageNum];
  }

  public close(numFullPages: number): void {
    for (let i = 0; i < numFullPages; i++) {
      this.flushPage(i, PAGE_SIZE);
    }

    const numAdditionalRows = this.numRows % TABLE_MAX_PAGES;
    if (numAdditionalRows > 0) {
      this.flushPage(numFullPages, numAdditionalRows * ROW_SIZE);
    }

    fs.closeSync(this.fileDescriptor);
    this.pages = [];
  }

  private flushPage(pageNum: number, size: number): void {
    if (!this.pages[pageNum]) {
      return;
    }
    const offset = pageNum * PAGE_SIZE;
    const bytesWritten = fs.writeSync(
      this.fileDescriptor,
      this.pages[pageNum],
      0,
      size,
      offset
    );
    if (bytesWritten < 0) {
      throw new Error(`Error writing file: ${bytesWritten}`);
    }
  }
}
