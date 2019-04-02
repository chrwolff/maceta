import * as path from "path";
import * as fileSystem from "fs-extra";
import { Injectable, Logger } from "@nestjs/common";

// https://github.com/lorenwest/node-config/wiki
const CONFIG_PATH = path.join(__dirname, "..", "config");
process.env.NODE_CONFIG_DIR = CONFIG_PATH;
import * as config from "config";
let mergedConfiguration = config.util.toObject();

@Injectable()
export class ConfigurationProvider {
  public readonly localLibraryPath: string;
  public readonly localHostname: string;
  public readonly localPort: number;
  public readonly resourceMap: { [key: string]: string };

  constructor() {
    Logger.log("Constructor", ConfigurationProvider.name);

    this.localHostname = config.get("hostname");
    this.localPort = config.get("port");
    this.localLibraryPath = "C:/workspace/ui5-lib/sapui5-sdk-1.63.1";
    this.resourceMap = {};
  }

  public static async saveConfig(configuration): Promise<void> {
    // load current config
    const configPath = path.join(CONFIG_PATH, "local.json");
    mergedConfiguration = config.util.extendDeep(
      mergedConfiguration,
      configuration,
    );

    // overwrite with new values
    /*Object.keys(options).forEach(key => {
      localConfiguration[key] = options[key];
    });*/

    const localConfiguration = config.util.diffDeep(
      mergedConfiguration,
      configuration,
    );
    // save config
    await fileSystem.writeJson(configPath, localConfiguration);
    ConfigurationProvider.displayConfiguration();
  }

  public static displayConfiguration() {
    Logger.log("\nCurrent global maceta configuration");
    Object.keys(mergedConfiguration)
      .filter(key => key !== "resourceMap")
      .forEach(key => console.log(`${key}: ${mergedConfiguration[key]}`));
  }
}
