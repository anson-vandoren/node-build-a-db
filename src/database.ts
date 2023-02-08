import { Pager } from './pager';
import { Table } from './table';

export class Database {
  public table: Table;

  constructor(filename: string) {
    const pager = new Pager(filename);
    this.table = new Table(pager);
  }

  public close(): void {
    this.table.close();
  }
}
