import { Args, UIProvider } from "@ton-ai-core/blueprint";
import { findCompiles, selectFile } from "@ton-ai-core/blueprint/dist/utils";
import { Sym } from "./util";
import {
  TactProjectInfo,
  extractProjectInfo,
  argsToStringList,
} from "./blueprint";
import {
  Result,
  runMistiCommand,
  createMistiCommand,
} from "@nowarp/misti/dist/cli";
import { setStdlibPath } from "./stdlibPaths";
import fs from "fs";
import path from "path";
import os from "os";

/**
 * Interactively selects one of the Tact projects available in the Blueprint compile wrapper.
 */
async function selectProject(
  ui: UIProvider,
  args: Args,
): Promise<TactProjectInfo> | never {
  const result = await selectFile(await findCompiles(), {
    ui,
    hint: args._.length > 1 && args._[1].length > 0 ? args._[1] : undefined,
    import: false,
  });
  if (!fs.existsSync(result.path)) {
    throw new Error(
      [
        `${Sym.ERR} Cannot access ${result.path}`,
        "Please specify path to your contract directly: `yarn blueprint misti path/to/contract.tact`",
      ].join("\n"),
    );
  }
  return await extractProjectInfo(result.name);
}

export class MistiExecutor {
  private constructor(
    private projectName: string,
    private args: string[],
    private ui: UIProvider,
  ) {}
  public static async fromArgs(
    args: Args,
    ui: UIProvider,
  ): Promise<MistiExecutor> | never {
    const argsStr = argsToStringList(args).slice(1);

    // Find and remove --blueprint-project argument
    // That's a blueprint-misti argument, not a Misti argument
    let blueprintProjectName: string | undefined;
    const projectIndex = argsStr.indexOf("--blueprint-project");
    if (projectIndex !== -1) {
      if (projectIndex + 1 < argsStr.length) {
        blueprintProjectName = argsStr[projectIndex + 1];
        argsStr.splice(projectIndex, 2); // Remove --blueprint-project and its value
      } else {
        throw new Error("--blueprint-project argument is missing a value");
      }
    }

    // Check if the first positional argument is a project name (non-interactive mode)
    // This handles the case when user runs: `npx blueprint misti MyContract`
    if (args._.length > 1 && !blueprintProjectName) {
      blueprintProjectName = args._[1];
    }

    // Try to find the project if a name was specified
    if (blueprintProjectName) {
      try {
        // First find all available compilations
        const compiles = await findCompiles();
        // Check if the specified project exists
        const projectExists = compiles.some(
          (c) => c.name === blueprintProjectName,
        );

        if (!projectExists) {
          // If project name was explicitly specified with --blueprint-project and not found, show error
          if (projectIndex !== -1) {
            throw new Error(`Project '${blueprintProjectName}' not found`);
          }
          // If it was a positional argument that's not found, warn and continue
          ui.write(
            `${Sym.WARN} '${blueprintProjectName}' is not recognized as a valid project. Continuing with alternative methods.`,
          );
        } else {
          // Project found, proceed with it
          const project = await extractProjectInfo(blueprintProjectName);
          const tactPath = this.generateTactConfig(project, ".");
          argsStr.push(tactPath);
          return new MistiExecutor(project.projectName, argsStr, ui);
        }
      } catch (error) {
        // If error in extracting project info
        if (error instanceof Error) {
          ui.write(
            `${Sym.WARN} Error processing project '${blueprintProjectName}': ${error.message}`,
          );
        }
        // If project name was explicitly specified with --blueprint-project and failed, show error
        if (projectIndex !== -1) {
          throw new Error(`Error processing project '${blueprintProjectName}'`);
        }
        // Otherwise warn and continue with alternative methods
        ui.write(`${Sym.WARN} Continuing with alternative methods.`);
      }
    }

    const command = createMistiCommand();
    await command.parseAsync(argsStr, { from: "user" });
    const tactPathIsDefined = command.args.length > 0;
    if (tactPathIsDefined) {
      // The path to the Tact configuration or contract is explicitly specified
      // in arguments (e.g. yarn blueprint misti path/to/contract.tact).
      const tactPath = command.args[0];
      const projectName = path.basename(tactPath).split(".")[0];
      return new MistiExecutor(projectName, argsStr, ui);
    } else {
      // Interactively select the project
      const project = await selectProject(ui, args);
      try {
        const tactPath = this.generateTactConfig(project, ".");
        argsStr.push(tactPath);
        return new MistiExecutor(project.projectName, argsStr, ui);
      } catch {
        throw new Error(`Cannot create a Tact config in current directory`);
      }
    }
  }

  /**
   * Generates the Tact configuration file based on the Blueprint compilation output.
   *
   * @param outDir Directory to save the generated file
   * @throws If it is not possible to create a path
   * @returns Absolute path to the generated config
   */
  private static generateTactConfig(
    config: TactProjectInfo,
    outDir: string,
  ): string | never {
    const project: any = {
      name: config.projectName,
      path: config.target,
      output: path.join(os.tmpdir(), "tact-output"),
    };
    if (config.options !== undefined) {
      project.options = config.options;
    }
    const content = JSON.stringify({
      projects: [project],
    });
    const outPath = path.join(outDir, "tact.config.json");
    fs.writeFileSync(outPath, content);
    return outPath;
  }

  public async execute(): Promise<Result> {
    this.ui.write(`${Sym.WAIT} Checking ${this.projectName}...\n`);
    setStdlibPath(this.args);
    return (await runMistiCommand(this.args))[1];
  }
}
