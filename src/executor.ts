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
    let blueprintProjectName: string | undefined;
    const projectIndex = argsStr.indexOf("--blueprint-project");
    if (projectIndex !== -1) {
      if (projectIndex + 1 < argsStr.length) {
        blueprintProjectName = argsStr[projectIndex + 1];
        argsStr.splice(projectIndex, 2);
      } else {
        throw new Error("--blueprint-project argument is missing a value");
      }
    }

    // Неинтерактивный режим: если передано имя контракта
    if (args._.length > 1 && !blueprintProjectName) {
      blueprintProjectName = args._[1];
    }
    if (blueprintProjectName) {
      const compiles = await findCompiles();
      const compile = compiles.find(c => c.name === blueprintProjectName);
      if (!compile) {
        const available = compiles.map(c => c.name).join(", ");
        throw new Error(
          `Contract with name '${blueprintProjectName}' not found. Available contracts: ${available}`
        );
      }
      // Получаем projectInfo
      const project = await extractProjectInfo(compile.name);
      // Используем project.target (а не compile.path!)
      return new MistiExecutor(project.projectName, [project.target], ui);
    }

    // Интерактивный режим
    const project = await selectProject(ui, args);
    return new MistiExecutor(project.projectName, [project.target], ui);
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
