import { autopilotMode, parseModeArgs } from "./skill-mode-registry.ts";

function main() {
  const result = autopilotMode(parseModeArgs(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
}

main();
