import { createInterface } from "readline";
import { doMetaCommand, prepareStatement, Statement } from "./commands";
import { executeStatement } from "./virtualMachine";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const readline = (prompt = "db> ") => new Promise<string>((resolve) => rl.question(prompt, resolve));

async function main() {
  while (true) {
    let input = (await readline()).trim();

    // check for metacommands first
    if (input.startsWith(".")) {
      try {
        doMetaCommand(input);
      } catch (e) {
        console.log('Unrecognized command "' + input + '".');
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
        console.log("Unknown error");
      }
      continue;
    }

    executeStatement(statement);
    console.log("Executed.");
  }
}

main();
