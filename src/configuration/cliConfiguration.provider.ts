import * as path from "path";
import * as fileSystem from "fs-extra";
import {
  ConfigurationBase,
  Options,
  CONFIG_INJECT,
  CONFIG_PATH,
} from "./configurationBase";
import { Injectable, Inject } from "@nestjs/common";
import { IConfig } from "config";
import { Logger } from "../logger";

@Injectable()
export class CliConfiguration extends ConfigurationBase {
  public readonly resourceMap: { [key: string]: string };

  constructor(@Inject(CONFIG_INJECT) config: IConfig, private logger: Logger) {
    super(config);
  }

  public async saveOptions(options: Options): Promise<void> {
    this.mergedConfiguration = this.config.util.extendDeep(
      this.mergedConfiguration,
      options,
    );

    // save config
    const configPath = path.join(CONFIG_PATH, "local.json");
    await fileSystem.writeJson(configPath, this.mergedConfiguration);
  }

  public displayConfiguration() {
    this.logger.log("Current global maceta configuration");
    Object.keys(this.mergedConfiguration)
      .filter(key => key !== "resourceMap")
      .forEach(key =>
        this.logger.log(`${key}: ${this.mergedConfiguration[key]}`),
      );
    this.logger.newLine();
  }
}
