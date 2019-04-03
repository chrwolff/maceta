import * as validator from "validator";
import { ConfigurationBase, Options, CONFIG_INJECT } from "./configurationBase";
import { Injectable, Inject } from "@nestjs/common";
import { IConfig } from "config";

export enum Exceptions {
  PORT_WRONG = "Port not configured correctly",
  HOSTNAME_WRONG = "Hostname not configured correctly",
  LIBRARY_WRONG = "UI5 library path not configured correctly",
  IS_SEALED = "Configuration cannot be changed after first get",
}

@Injectable()
export class ServerConfiguration extends ConfigurationBase {
  private options: Options;
  public readonly resourceMap: { [key: string]: string };
  private isChecked: boolean = false;

  constructor(@Inject(CONFIG_INJECT) config: IConfig) {
    super(config);
    this.options = {
      hostname: this.config.has("hostname")
        ? this.config.get("hostname")
        : null,
      port: this.config.has("port") ? this.config.get("port") : null,
      ui5LibraryPath: this.config.has("ui5LibraryPath")
        ? this.config.get("ui5LibraryPath")
        : null,
    };

    this.resourceMap = {};
  }

  get hostname(): string {
    this.checkAndSeal();
    return this.options.hostname;
  }

  get port(): number {
    this.checkAndSeal();
    return this.options.port;
  }

  get ui5LibraryPath(): string {
    this.checkAndSeal();
    return ConfigurationBase.getAbolutePath(this.options.ui5LibraryPath);
  }

  public setOptions(options: Options) {
    if (this.isChecked) {
      throw new Error(Exceptions.IS_SEALED);
    }
    this.options = Object.assign(this.options, options);
  }

  public checkAndSeal() {
    if (this.isChecked) {
      return;
    }
    this.isChecked = true;

    if (this.options.port === null || this.options.port <= 0) {
      throw new Error(Exceptions.PORT_WRONG);
    }

    if (
      this.options.hostname === null ||
      !validator.isURL(this.options.hostname, {
        require_valid_protocol: false,
        require_tld: false,
      })
    ) {
      throw new Error(Exceptions.HOSTNAME_WRONG);
    }

    if (
      this.options.ui5LibraryPath === null ||
      !ConfigurationBase.pathExists(this.options.ui5LibraryPath)
    ) {
      throw new Error(Exceptions.LIBRARY_WRONG);
    }
  }
}
