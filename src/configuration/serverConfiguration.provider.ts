import * as validator from "validator";
import * as fileSystem from "fs-extra";
import * as path from "path";
import * as directoryTree from "directory-tree";
import * as PromptRadio from "prompt-radio";
import * as readlineUi from "readline-ui";

import {
  ConfigurationBase,
  Options,
  LocalConfiguration,
  ApplicationConfiguration,
  ResourceMap,
  ShellConfiguration,
  CONFIG_INJECT,
} from "./configurationBase";
import { Injectable, Inject } from "@nestjs/common";
import { IConfig } from "config";
import { Logger } from "../logger";

export enum Exceptions {
  PORT_WRONG = "Port not configured correctly",
  HOSTNAME_WRONG = "Hostname not configured correctly",
  LIBRARY_WRONG = "UI5 library path not configured correctly",
  IS_SEALED = "Configuration cannot be changed after first get",
}

interface ManifestProperties {
  directory: string;
  componentId: string;
  libraries: string[];
}

@Injectable()
export class ServerConfiguration extends ConfigurationBase {
  private options: Options;
  private isChecked: boolean = false;
  private readlineUi;

  constructor(@Inject(CONFIG_INJECT) config: IConfig, private logger: Logger) {
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
    return ConfigurationBase.getAbsoluteNormalizedPath(
      this.options.ui5LibraryPath,
    );
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

  public async determineLocaleConfiguration(withInteraction: boolean = false) {
    this.readlineUi = readlineUi.create();

    const localConfiguration: LocalConfiguration = await this.getLocalConfiguration(
      withInteraction,
    );

    const manifestProperties: ManifestProperties = await this.getManifestDir(
      withInteraction,
    );

    this.readlineUi.close();

    if (localConfiguration) {
      if (localConfiguration.ui5LibraryPath) {
        const options: Options = {
          ui5LibraryPath: localConfiguration.ui5LibraryPath,
        };
        this.setOptions(options);
      }
    }
  }

  private async getLocalConfiguration(
    withInteraction: boolean,
  ): Promise<LocalConfiguration> {
    const directories = directoryTree(ConfigurationBase.basePath, {
      extensions: /\.json/,
      exclude: /node_modules/,
    });

    const foundDirectories: string[] = [];
    searchMacetaConfig(directories);

    function searchMacetaConfig(dirObject) {
      if ("children" in dirObject) {
        if (
          dirObject.children.reduce(
            (hasFile, entry) => hasFile || entry.name === "maceta.config.json",
            false,
          )
        ) {
          foundDirectories.push(dirObject.path);
        }
        dirObject.children.forEach(entry => searchMacetaConfig(entry));
      }
    }

    let selectedDirectory: string;
    if (foundDirectories.length === 0) {
      this.logger.warn("No maceta.config.json found");
    } else if (foundDirectories.length === 1) {
      this.logger.log(`Using maceta.config.json from ${foundDirectories[0]}`);
      selectedDirectory = foundDirectories[0];
    } else if (withInteraction) {
      try {
        selectedDirectory = await this.getMacetaDirectoryChoice(
          foundDirectories,
        );
      } catch (error) {
        this.logger.warn("No directory selected!");
      }
    }

    if (!selectedDirectory) {
      return {};
    }

    try {
      const fileContent = await fileSystem.readJson(
        path.join(selectedDirectory, "maceta.config.json"),
      );
      const localConfiguration: LocalConfiguration = { ...fileContent };
      return localConfiguration;
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async getMacetaDirectoryChoice(directories): Promise<string> {
    return new Promise((resolve, reject) => {
      this.logger.newLine();
      const prompt = new PromptRadio({
        name: "macetaConfigDir",
        message:
          "Select the maceta configuration directory\n(Select with the spacebar, continue with enter)",
        choices: directories,
        ui: this.readlineUi,
      });
      prompt.ask(selected => {
        if (selected) {
          resolve(selected);
        } else {
          reject();
        }
      });
    });
  }

  private async getManifestDir(
    withInteraction: boolean,
  ): Promise<ManifestProperties> {
    const directories = directoryTree(ConfigurationBase.basePath, {
      extensions: /\.json/,
      exclude: /node_modules/,
    });

    const foundDirectories: string[] = [];
    searchManifest(directories);

    function searchManifest(dirObject) {
      if ("children" in dirObject) {
        if (
          dirObject.children.reduce(
            (hasManifest, entry) =>
              hasManifest || entry.name === "manifest.json",
            false,
          )
        ) {
          foundDirectories.push(dirObject.path);
        }
        dirObject.children.forEach(entry => searchManifest(entry));
      }
    }

    interface RawManifest {
      manifest: object;
      directory: string;
    }

    let manifestObjects = await Promise.all(
      foundDirectories.map(async directory => {
        const manifest = await fileSystem.readJson(
          path.join(directory, "manifest.json"),
        );
        const rawManifest: RawManifest = {
          directory,
          manifest,
        };
        return rawManifest;
      }),
    );

    manifestObjects = manifestObjects.filter(
      entry =>
        "sap.app" in entry.manifest &&
        "type" in entry.manifest["sap.app"] &&
        entry.manifest["sap.app"].type === "application",
    );

    const manifestPropertiesList = manifestObjects.map(entry => {
      let componentId: string;
      let libraries: string[];
      if ("sap.app" in entry.manifest && "id" in entry.manifest["sap.app"]) {
        componentId = entry.manifest["sap.app"].id;
      }
      if (
        "sap.ui5" in entry.manifest &&
        "dependencies" in entry.manifest["sap.ui5"] &&
        "libs" in entry.manifest["sap.ui5"].dependencies
      ) {
        libraries = Object.keys(entry.manifest["sap.ui5"].dependencies.libs);
        libraries = libraries.filter(lib => lib.split(".")[0] !== "sap");
      }
      const manifestProperties: ManifestProperties = {
        componentId,
        libraries,
        directory: entry.directory,
      };
      return manifestProperties;
    });

    if (manifestPropertiesList.length === 1) {
      this.logger.log(
        `Manifest folder found: ${manifestPropertiesList[0].directory}`,
      );
      return manifestPropertiesList[0];
    } else if (manifestPropertiesList.length > 1 && withInteraction) {
      try {
        return await this.getManifestDirectoryChoice(manifestPropertiesList);
      } catch (error) {
        this.logger.error("No manifest selected!");
      }
    } else {
      this.logger.error("No manifest found!");
    }
  }

  private async getManifestDirectoryChoice(
    manifestPropertiesList: ManifestProperties[],
  ): Promise<ManifestProperties> {
    return new Promise((resolve, reject) => {
      this.logger.newLine();
      const prompt = new PromptRadio({
        name: "manifestDir",
        message:
          "Select the app directory\n(Select with the spacebar, continue with enter)",
        choices: manifestPropertiesList.map(entry => entry.directory),
        ui: this.readlineUi,
      });

      prompt.ask(selected => {
        if (selected) {
          resolve(selected);
        } else {
          reject();
        }
      });
    });
  }
}
