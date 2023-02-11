import { createInterface } from 'readline/promises';
import { doMetaCommand, prepareStatement, Statement } from './commands';
import { executeStatement } from './virtualMachine';
import { Database } from './database';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  // TODO: add completer
});

async function main() {
  const dbFile = process.argv[2];
  const db = new Database(dbFile);
  process.on('SIGINT', () => {
    db.close();
    process.exit(0);
  });

  while (true) {
    let input = (await rl.question('db> ')).trim();

    // check for metacommands first
    if (input.startsWith('.')) {
      try {
        doMetaCommand(input, db);
        continue;
      } catch (e) {
        console.log(`Unrecognized command ${input}.`);
        // TODO: show where the error is
        continue;
      }
    }

    let statement: Statement;
    try {
      statement = prepareStatement(input);
    } catch (e: unknown) {
      if (e instanceof Error) {
        console.log(e.message);
      } else {
        console.log('Unknown error');
      }
      continue;
    }

    executeStatement(statement, db.table);
    console.log('Executed.');
  }
}

main();
