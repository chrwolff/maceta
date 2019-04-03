import * as path from "path";
import * as fileSystem from "fs-extra";
import { IConfig } from "config";
import { Provider, Logger } from "@nestjs/common";

export const CONFIG_INJECT = "CONFIGURATION";
export const CONFIG_PATH = path.join(__dirname, "../..", "config");

export interface Options {
  readonly hostname?: string;
  readonly port?: number;
  readonly ui5LibraryPath?: string;
}

export class ConfigurationBase {
  protected mergedConfiguration: object;

  constructor(protected config: IConfig) {
    this.mergedConfiguration = config.util.toObject();
  }

  public static getPersistedConfiguration(configPath?: string): Provider {
    if (!configPath) {
      configPath = CONFIG_PATH;
    }

    if (!ConfigurationBase.pathExists(configPath)) {
      Logger.error(`Configuration path ${configPath} does not exist!`);
    }

    process.env.NODE_CONFIG_DIR = configPath;
    process.env.SUPPRESS_NO_CONFIG_WARNING = "true";

    // https://github.com/lorenwest/node-config/wiki
    return {
      provide: CONFIG_INJECT,
      useValue: require("config"),
    };
  }

  protected static getAbolutePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(process.cwd(), filePath);
  }

  protected static pathExists(filePath: string): boolean {
    try {
      const absolutePath = ConfigurationBase.getAbolutePath(filePath);
      const stats = fileSystem.statSync(absolutePath);
      return stats.isDirectory();
    } catch (e) {
      return false;
    }
  }
}
