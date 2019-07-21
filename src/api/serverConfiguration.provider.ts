import * as validator from "validator";
import * as fileSystem from "fs-extra";
import * as path from "path";

import { Injectable } from "@nestjs/common";

const DEFAULT = "default";

export enum Exceptions {
  BASE_PATH_WRONG = "Base path not configured correctly",
  COMPONENT_PATH_WRONG = "Component path not configured correctly",
  ODATA_PATH_WRONG = "OData path not configured correctly",
  PORT_WRONG = "Port not configured correctly",
  HOSTNAME_WRONG = "Hostname not configured correctly",
  LIBRARY_WRONG = "UI5 library path not configured correctly",
  IS_SEALED = "Configuration cannot be changed after first get",
  MANIFEST_NO_ID = "Manifest contains no id",
  NOT_CHECKED_YET = "Configuration is not checked and sealed yet"
}

export interface ConfigurationOptions {
  ui5LibraryPath: string;
  basePath: string;
  componentPath: string;
  oDataPath?: string;
  hostname: string;
  port: number;
  shellEmbedded: boolean;
}

export interface Resource {
  namespace: string;
  path: string;
  shellConfigurationKey?: string;
  sapServer?: boolean;
}

type ResourceMap = Map<string, string>;

interface Configuration extends ConfigurationOptions {
  resourceMap: ResourceMap;
  shellId?: string;
  language?: string;
}

interface ResourcePathEntry {
  file: boolean;
  path?: string;
}

interface ResourcePath {
  [key: string]: ResourcePathEntry;
}

interface ShellConfiguration {
  [key: string]: {
    app?: {
      ui5ComponentName: string;
      languages: string[];
    };
    resourcePath: ResourcePath;
  };
}

@Injectable()
export class ServerConfiguration {
  private configuration: Configuration;
  private resources: Resource[] = [];
  private shellConfig: ShellConfiguration = null;
  private isChecked: boolean = false;

  constructor() {
    this.configuration = {
      ui5LibraryPath: "",
      basePath: "",
      componentPath: "",
      hostname: "localhost",
      port: 3000,
      shellEmbedded: false,
      resourceMap: new Map<string, string>()
    };
  }

  get hostname(): string {
    this.checkAndSeal();
    return this.configuration.hostname;
  }

  get port(): number {
    this.checkAndSeal();
    return this.configuration.port;
  }

  get ui5LibraryPath(): string {
    this.checkAndSeal();
    return this.configuration.ui5LibraryPath;
  }

  get basePath(): string {
    this.checkAndSeal();
    return this.configuration.basePath;
  }

  get componentPath(): string {
    this.checkAndSeal();
    return this.configuration.componentPath;
  }

  get shellConfiguration(): ShellConfiguration {
    this.checkAndSeal();
    return this.shellConfig;
  }

  get resourceMap(): ResourceMap {
    this.checkAndSeal();
    return this.configuration.resourceMap;
  }

  get oDataPath(): string {
    this.checkAndSeal();
    return this.configuration.oDataPath;
  }

  get browserUrl(): String {
    if (!this.isChecked) {
      throw new Error(Exceptions.NOT_CHECKED_YET);
    }

    let url = `http://${this.configuration.hostname}:${this.configuration.port}/`;
    if (this.configuration.shellEmbedded) {
      url = `${url}shell?sap-ushell-config=standalone&local-ushell-config=${this.configuration.shellId}`;
      if (this.configuration.language) {
        url = `${url}&sap-language=${this.configuration.language}`;
      }
      url = `${url}#Shell-runStandaloneApp`;
    } else {
      url = `${url}/index.html`;
    }
    return url;
  }

  public setOptions(
    options: ConfigurationOptions,
    resources?: Resource[]
  ): void {
    if (this.isChecked) {
      throw new Error(Exceptions.IS_SEALED);
    }
    this.configuration = Object.assign(this.configuration, options);

    if (resources) {
      this.resources = resources.map(resource => {
        if (!resource.shellConfigurationKey) {
          resource.shellConfigurationKey = DEFAULT;
        }
        resource.sapServer = Boolean(resource.sapServer);
        return resource;
      });
    } else {
      this.resources = [];
    }
  }

  public checkAndSeal(): void {
    if (this.isChecked) {
      return;
    }
    this.isChecked = true;

    if (
      !path.isAbsolute(this.configuration.basePath) ||
      !this.pathExists(this.configuration.basePath)
    ) {
      throw new Error(Exceptions.BASE_PATH_WRONG);
    }

    if (this.configuration.port <= 0) {
      throw new Error(Exceptions.PORT_WRONG);
    }

    if (
      !validator.isURL(this.configuration.hostname, {
        require_valid_protocol: false,
        require_tld: false
      })
    ) {
      throw new Error(Exceptions.HOSTNAME_WRONG);
    }

    if (!this.pathExists(this.configuration.ui5LibraryPath)) {
      throw new Error(Exceptions.LIBRARY_WRONG);
    }
    this.configuration.ui5LibraryPath = this.getAbsoluteNormalizedPath(
      this.configuration.ui5LibraryPath
    );

    if (!this.pathExists(this.configuration.componentPath)) {
      throw new Error(Exceptions.COMPONENT_PATH_WRONG);
    }
    this.configuration.componentPath = this.getAbsoluteNormalizedPath(
      this.configuration.componentPath
    );

    if (this.configuration.oDataPath) {
      if (!this.pathExists(this.configuration.oDataPath)) {
        throw new Error(Exceptions.ODATA_PATH_WRONG);
      }
      this.configuration.oDataPath = this.getAbsoluteNormalizedPath(
        this.configuration.oDataPath
      );
    }

    let componentId: string;
    let nonSapNamespaces: string[];
    const manifestPath = path.join(
      this.configuration.componentPath,
      "manifest.json"
    );

    const manifest = fileSystem.readJSONSync(manifestPath);
    if ("sap.app" in manifest && "id" in manifest["sap.app"]) {
      componentId = manifest["sap.app"].id;
    } else {
      throw Error(Exceptions.MANIFEST_NO_ID);
    }
    if (
      "sap.ui5" in manifest &&
      "dependencies" in manifest["sap.ui5"] &&
      "libs" in manifest["sap.ui5"].dependencies
    ) {
      nonSapNamespaces = Object.keys(
        manifest["sap.ui5"].dependencies.libs
      ).filter((lib: string) => lib.split(".")[0] !== "sap");
    }

    this.resources = this.resources.filter(resource =>
      nonSapNamespaces.includes(resource.namespace)
    );

    this.configuration.shellEmbedded = this.resources.reduce(
      (value, resource) =>
        value ||
        (resource.shellConfigurationKey !== DEFAULT || resource.sapServer),
      this.configuration.shellEmbedded
    );

    if (this.configuration.shellEmbedded) {
      this.configuration.shellId = DEFAULT;
      this.shellConfig = {
        default: {
          app: {
            languages: [],
            ui5ComponentName: componentId
          },
          resourcePath: {}
        }
      };
    }

    this.configuration.resourceMap.set(
      componentId,
      this.configuration.componentPath
    );

    this.resources.forEach(resource => this.createResourcePath(resource));
  }

  private createResourcePath(resource: Resource): void {
    if (!resource.sapServer) {
      this.configuration.resourceMap.set(
        resource.namespace,
        this.getAbsoluteNormalizedPath(resource.path)
      );
    }

    if (this.shellConfig) {
      if (!(resource.shellConfigurationKey in this.shellConfig)) {
        this.shellConfig[resource.shellConfigurationKey] = {
          resourcePath: {}
        };
      }
      let pathObject: ResourcePathEntry;
      if (resource.sapServer) {
        pathObject = {
          path: resource.path,
          file: false
        };
      } else {
        pathObject = {
          file: true
        };
      }

      this.shellConfig[resource.shellConfigurationKey].resourcePath[
        resource.namespace
      ] = pathObject;
    }
  }

  public getAbsoluteNormalizedPath(filePath: string): string {
    let absolutePath: string;
    if (path.isAbsolute(filePath)) {
      absolutePath = filePath;
    } else {
      absolutePath = path.join(this.configuration.basePath, filePath);
    }
    return path.normalize(absolutePath);
  }

  private pathExists(filePath: string): boolean {
    try {
      const absolutePath = this.getAbsoluteNormalizedPath(filePath);
      const stats = fileSystem.statSync(absolutePath);
      return stats.isDirectory();
    } catch (e) {
      return false;
    }
  }
}
