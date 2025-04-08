/**
 * Provides additional hacks to find paths to the Tact stdlib.
 * These are necessary since we need to find them in node_modules, which has a different structure depending on the package manager.
 *
 * @packageDocumentation
 */
import path from "path";
import fs from "fs";
import { getDefaultStdlibPathElements } from "@nowarp/misti/dist/internals/tact";

const STDLIB_PATH_ARG = "--tact-stdlib-path";

/**
 * Returns true if there is an explicitly specified path to the Tact stdlib in the list of arguments.
 */
function hasStdlibPath(args: string[]): boolean {
  return args.find((a) => a === STDLIB_PATH_ARG) !== undefined;
}

/**
 * Finds a directory whose name starts with `prefix` inside `startPath`.
 */
function findDirectoryPath(
  startPath: string,
  prefix: string,
): string | undefined {
  const files = fs.readdirSync(startPath);
  for (const file of files) {
    const filePath = path.join(startPath, file);
    if (fs.statSync(filePath).isDirectory() && file.startsWith(prefix)) {
      return path.relative(startPath, filePath);
    }
  }
  return undefined;
}

/**
 * Finds the path to `stdlib.tact` in the `node_modules` of all the messed-up
 * directory structures generated by any imaginable npm garbage.
 *
 * XXX: Touching paths below is not only dangerous; it should be considered illegal.
 */
function setTactStdlibPath(): string {
  let distPathPrefix = __dirname.includes("/dist/")
    ? path.join("..", "..", "..", "..")
    : path.join("..", "..", "..");

  // pnpm (https://pnpm.io/) is another package manager which introduces a path
  // structure different from yarn/npm. This hack bypasses it.
  const pnpmDir = path.join(
    path.resolve(__dirname, distPathPrefix),
    "..",
    "..",
  );
  if (path.basename(pnpmDir).includes("pnpm")) {
    const mistiDir = findDirectoryPath(pnpmDir, "@nowarp+misti");
    if (mistiDir !== undefined) {
      distPathPrefix = path.join(
        distPathPrefix,
        "..",
        "..",
        mistiDir,
        "node_modules",
      );
    }
  }

  return path.resolve(
    __dirname,
    distPathPrefix,
    ...getDefaultStdlibPathElements(),
  );
}

/**
 * Adds STDLIB_PATH_ARG to the list of arguments if not set.
 *
 * This is required to use Tact's stdlib from the `node_modules` of the current
 * blueprint project because it is not included in the `node_modules/@nowarp/misti`.
 */
export function setStdlibPath(args: string[]): void {
  if (hasStdlibPath(args)) return;
  args.push(STDLIB_PATH_ARG);
  args.push(setTactStdlibPath());
}
