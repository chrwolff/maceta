import * as path from "path";
import * as fileSystem from "fs-extra";
import { IConfig } from "config";
import { Provider, Logger } from "@nestjs/common";

export const CONFIG_INJECT = "GLOBAL_CONFIGURATION";
export const CONFIG_PATH = path.join(__dirname, "../..", "config");

// CLI options
export interface Options {
  readonly hostname?: string;
  readonly port?: number;
  readonly ui5LibraryPath?: string;
}

// options from local application dir
export interface LocalConfiguration {
  readonly ui5LibraryPath?: string;
}

export class ConfigurationBase {
  protected mergedConfiguration: object;
  protected static basePath = process.cwd();

  constructor(protected config: IConfig) {
    this.mergedConfiguration = config.util.toObject();
  }

  public static getGlobalConfiguration(configPath?: string): Provider {
    if (!configPath) {
      configPath = CONFIG_PATH;
    }

    if (!ConfigurationBase.pathExists(configPath)) {
      Logger.error(`Configuration path ${configPath} does not exist!`);
    }

    // https://github.com/lorenwest/node-config/wiki
    process.env.NODE_CONFIG_DIR = configPath;
    process.env.SUPPRESS_NO_CONFIG_WARNING = "true";

    return {
      provide: CONFIG_INJECT,
      useValue: require("config"),
    };
  }

  protected static getAbolutePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(ConfigurationBase.basePath, filePath);
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
