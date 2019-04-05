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

export interface ResourceMap {
  [key: string]: string;
}

export interface ApplicationConfiguration {
  languages?: string[];
  resourceMap?: ResourceMap;
}

// options from local application dir
export interface LocalConfiguration {
  readonly ui5LibraryPath?: string;
  readonly application?: {
    [key: string]: ApplicationConfiguration;
  };
}

export interface ShellConfiguration {
  [key: string]: {
    app: {
      ui5ComponentName: string;
      languages: string[];
    };
    resourcePath: ResourceMap;
  };
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
    const config = require("config");

    return {
      provide: CONFIG_INJECT,
      useValue: config,
    };
  }

  protected static getAbsoluteNormalizedPath(filePath: string): string {
    let absolutePath: string;
    if (path.isAbsolute(filePath)) {
      absolutePath = filePath;
    } else {
      absolutePath = path.join(ConfigurationBase.basePath, filePath);
    }
    return path.normalize(absolutePath);
  }

  protected static pathExists(filePath: string): boolean {
    try {
      const absolutePath = ConfigurationBase.getAbsoluteNormalizedPath(
        filePath,
      );
      const stats = fileSystem.statSync(absolutePath);
      return stats.isDirectory();
    } catch (e) {
      return false;
    }
  }
}
