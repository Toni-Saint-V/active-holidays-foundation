import { parseModeArgs, startMode } from "./skill-mode-registry.ts";

function main() {
  const result = startMode(parseModeArgs(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
}

main();
