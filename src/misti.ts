import { Runner, Args, UIProvider } from "@ton-ai-core/blueprint";
import { MistiExecutor } from "./executor";
import { Sym } from "./util";
import {
  Result,
  resultToString,
  runMistiCommand,
} from "@nowarp/misti/dist/cli";
import { findCompiles } from "@ton-ai-core/blueprint/dist/utils";
// Prefix unused imports with _ to satisfy linter ('Allowed unused vars must match /^_/u')
import {
  TactProjectInfo as _TactProjectInfo,
  extractProjectInfo,
  argsToStringList as _argsToStringList,
} from "./blueprint";
import { setStdlibPath } from "./stdlibPaths";

/**
 * Outputs the Misti result using the UI provider and returns the exit code.
 *
 * Exit codes reference: https://nowarp.io/tools/misti/docs/tutorial/cli#exit-codes
 */
function handleResult(result: Result, ui: UIProvider): number {
  // Prepare the full string before calling ui.write
  let outputStr = resultToString(result, "plain");
  let exitCode = 0;

  switch (result.kind) {
    case "warnings":
      exitCode = 1;
      break; // Keep the original result string
    case "error":
      outputStr = `${Sym.ERR} ${outputStr}`; // Prepend symbol
      exitCode = 2;
      break;
    case "ok":
      outputStr = `${Sym.OK} ${outputStr}`; // Prepend symbol
      exitCode = 0;
      break;
    case "tool":
      exitCode = 0;
      break; // Keep the original result string
  }
  // Call ui.write with a single argument
  ui.write(outputStr);
  return exitCode;
}

export const misti: Runner = async (args: Args, ui: UIProvider) => {
  try {
    // Check for --all flag
    // Rely only on positional arguments, assuming Blueprint passes unknown flags here
    const positionalArgs = args._.slice(1); // Args after 'misti' subcommand
    const isAllFlagSet = positionalArgs.includes('--all');

    // Filter out --all from args passed to other functions if necessary
    const filteredArgs = { ...args };
    if (isAllFlagSet) {
      filteredArgs._ = args._.filter(arg => arg !== '--all');
    }

    if (isAllFlagSet) {
      ui.write(`[INFO] Analyzing all projects...\n`);
      const compiles = await findCompiles();
      const results: { project: string; result: Result }[] = [];
      let hasError = false;
      let hasWarning = false;

      for (const compile of compiles) {
        let mistiResult: Result | null = null;
        try {
          const projectInfo = await extractProjectInfo(compile.name);
          ui.write(
            `${Sym.WAIT} Analyzing project: ${projectInfo.projectName}...`,
          );

          // --- Replace simulation with actual call ---
          const projectArgs = [projectInfo.target];
          setStdlibPath(projectArgs);
          // Actual call to run Misti analysis
          mistiResult = (await runMistiCommand(projectArgs))[1];
          // --- Removed simulation ---

          if (!mistiResult)
            throw new Error("Analysis did not produce a result");

          // Prepare the output string first
          const resultStr = resultToString(mistiResult, "plain");
          // Call ui.write with a single argument
          ui.write(resultStr);
          results.push({
            project: projectInfo.projectName,
            result: mistiResult,
          });

          if (mistiResult.kind === "error") hasError = true;
          if (mistiResult.kind === "warnings") hasWarning = true;
        } catch (projectErr) {
          const errorMessage =
            projectErr instanceof Error
              ? projectErr.message
              : JSON.stringify(projectErr);
          // Prepare the full error string first
          const errorOutput = `${Sym.ERR} Failed to analyze project ${compile.name}: ${errorMessage}\n`;
          // Call ui.write with a single argument
          ui.write(errorOutput);
          mistiResult = { kind: "error", error: errorMessage };
          results.push({ project: compile.name, result: mistiResult });
          hasError = true;
        }
      }

      // Determine final exit code after analyzing all projects
      let finalExitCode = 0;
      let finalMessage = "";
      if (hasError) {
        finalExitCode = 2;
        finalMessage = `\n${Sym.ERR} Analysis finished with errors.`;
      } else if (hasWarning) {
        finalExitCode = 1;
        finalMessage = `\n${Sym.WARN} Analysis finished with warnings.`;
      } else {
        finalMessage = `\n${Sym.OK} Analysis finished successfully for all projects.`;
      }
      ui.write(finalMessage);
      process.exit(finalExitCode);
    } else {
      // Original logic for single project (interactive or specified)
      // Pass original args (or filteredArgs if needed by MistiExecutor)
      const executor = await MistiExecutor.fromArgs(args, ui);
      const result = await executor.execute();
      process.exit(handleResult(result, ui));
    }
  } catch (err) {
    if (err instanceof Error) {
      ui.write(`${Sym.ERR} ${err.message}`);
      return;
    } else {
      ui.write(
        [
          `${Sym.ERR} Unknown error: ${JSON.stringify(err)}`,
          "Please report it: https://github.com/nowarp/blueprint-misti/issues",
        ].join("\n"),
      );
    }
  }
};
