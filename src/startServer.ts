import * as fileSystem from "fs-extra";
//const open = require("open");
import * as directoryTree from "directory-tree";
import * as PromptRadio from "prompt-radio";
//const ConfirmPrompt = require("prompt-confirm");
import * as ReadlineUi from "readline-ui";
import * as path from "path";
import { NestFactory } from "@nestjs/core";
import {
  ServerModule,
  ConfigurationOptions,
  Resource,
  ServerConfiguration
} from "./api/index";
import { logSuccess, logError, logNewline, logWarning } from "./consoleOutput";

process.env["NODE_CONFIG_DIR"] = path.join(__dirname, "..", "config");
const configFile = require("config");

export async function startServer(cliOptions) {
  const { options, resources } = await getConfiguration(cliOptions);

  try {
    const server = await NestFactory.create(ServerModule);

    let serverConfiguration: ServerConfiguration = server.get(
      ServerConfiguration
    );

    serverConfiguration.setOptions(options, resources);
    serverConfiguration.checkAndSeal();

    await server.listenAsync(
      serverConfiguration.port,
      serverConfiguration.hostname
    );

    logSuccess(`${serverConfiguration.hostname}:${serverConfiguration.port}`);
    logSuccess("Server started");

    /*
    if ("shell" in macetaConfiguration) {
      logSuccess(`Shell embedded mode started: ${url}\n`);
    } else {
      url = `${url}index.html`;
      logSuccess(`Server running at: ${url}\n`);
    }
    opn(url);
    */
  } catch (e) {
    logError(e);
  }
}

async function getConfiguration(
  cliOptions
): Promise<{ options: ConfigurationOptions; resources: Resource[] }> {
  const basePath = process.cwd();
  logSuccess(`Using ${basePath} as application path`);

  let projectConfig: ConfigurationOptions = {
    basePath,
    componentPath: null,
    oDataPath: configFile.has("oDataPath") ? configFile.get("oDataPath") : null,
    shellEmbedded: false,
    ui5LibraryPath: configFile.has("ui5LibraryPath")
      ? configFile.get("ui5LibraryPath")
      : null,
    hostname: configFile.get("hostname"),
    port: configFile.get("port")
  };

  Object.keys(cliOptions).forEach(
    key => (projectConfig[key] = cliOptions[key])
  );

  const readlineUi = ReadlineUi.create();

  const macetaConfiguration: any = await getMacetaConfig(basePath);
  if ("ui5LibraryPath" in macetaConfiguration) {
    projectConfig.ui5LibraryPath = getAbolutePath(
      basePath,
      macetaConfiguration.ui5LibraryPath
    );
  }

  if (projectConfig.ui5LibraryPath == undefined) {
    logError("No UI5 library path is configured!");
  }

  let shellId = null;
  let indexHtmlPath;
  if ("shell" in macetaConfiguration) {
    shellId = await getShellId(macetaConfiguration.shell);
    projectConfig.shellEmbedded = true;
  } else {
    indexHtmlPath = await getIndexHtmlPath(basePath);
    if (indexHtmlPath === null) {
      logWarning("No index.html found");
      logSuccess("Using default shell configuration");
      projectConfig.shellEmbedded = true;
    } else {
      projectConfig.basePath = indexHtmlPath;
    }
  }

  projectConfig.componentPath = await getManifestDir(basePath);

  if ("oDataPath" in macetaConfiguration) {
    projectConfig.oDataPath = getAbolutePath(
      basePath,
      macetaConfiguration.oDataPath
    );
  } else {
    const oDataPath = await getOdataDir(basePath);
    if (oDataPath != undefined) {
      projectConfig.oDataPath = oDataPath;
    }
  }

  let resourcesObject: { [key: string]: Resource } = {};
  if (configFile.has("resourceMap")) {
    const fileResources = configFile.get("resourceMap");
    Object.keys(fileResources).forEach(namespace => {
      resourcesObject[namespace] = {
        namespace,
        path: fileResources[namespace]
      };
    });
  }

  if ("shell" in macetaConfiguration) {
    const configs = macetaConfiguration.shell;
    Object.keys(configs).forEach(shellConfigurationKey => {
      /*if (key !== "default") {
        server.createShellConfigurationKey(key);
      }
      if ("languages" in configs[key]) {
        server.setShellLanguages(configs[key].languages);
      }*/
      if ("resourceMap" in configs[shellConfigurationKey]) {
        let rsPath = configs[shellConfigurationKey].resourceMap;
        Object.keys(rsPath).forEach(namespace => {
          resourcesObject[namespace] = {
            namespace,
            path: rsPath[namespace],
            shellConfigurationKey
          };
        });
      }
    });
    /*if (shellId != undefined) {
      server.setShellConfigurationKey(shellId);
    }*/
  }

  const resources: Resource[] = Object.keys(resourcesObject).map(
    key => resourcesObject[key]
  );

  return { options: projectConfig, resources };

  function getAbolutePath(rootDir: string, filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(rootDir, filePath);
  }

  async function getMacetaConfig(applicationDir): Promise<object> {
    let directories = directoryTree(applicationDir, {
      extensions: /\.json/,
      exclude: /node_modules/
    });

    let foundDirectories = [];
    searchMacetaConfig(directories);

    function searchMacetaConfig(dirObject) {
      if ("children" in dirObject) {
        if (
          dirObject.children.reduce(
            (hasFile, entry) => hasFile || entry.name === "maceta.config.json",
            false
          )
        ) {
          foundDirectories.push(dirObject.path);
        }
        dirObject.children.forEach(entry => searchMacetaConfig(entry));
      }
    }

    let selectedDirectory;
    try {
      selectedDirectory = await getMacetaDirectoryChoice(foundDirectories);
    } catch (error) {
      logError(`${error}`);
    }

    if (selectedDirectory == undefined) {
      return {};
    }

    try {
      return await fileSystem.readJson(
        path.join(selectedDirectory, "maceta.config.json")
      );
    } catch (e) {
      logError(`${e}`);
    }
  }

  function getMacetaDirectoryChoice(directories) {
    if (directories.length === 0) {
      logWarning("No maceta.config.json found");
      return null;
    } else if (directories.length === 1) {
      logSuccess(`Using maceta.config.json from ${directories[0]}`);
      return directories[0];
    } else {
      logNewline();
      let prompt = new PromptRadio({
        name: "macetaConfigDir",
        message:
          "Select the maceta configuration directory\n(Select with the spacebar, continue with enter)",
        choices: directories
        //ui: readlineUi
      });
      return new Promise((resolve, reject) => {
        prompt.ask(selected => {
          if (selected) {
            resolve(selected);
          } else {
            reject("No directory selected!");
          }
        });
      });
    }
  }

  // read the shellConfig.json. if there are more options besides default
  // then prompt for a choice.
  async function getShellId(shellConfig: any): Promise<string> {
    if ("default" in shellConfig) {
      let configKeys = Object.keys(shellConfig);
      if (configKeys.length === 1) {
        return configKeys[0];
      } else {
        try {
          return await shellConfigIdPrompt(configKeys);
        } catch (error) {
          logError(error);
        }
      }
    } else {
      logError("shell configuration contains no 'default' key!");
    }
  }

  function shellConfigIdPrompt(configKeys): Promise<string> {
    logNewline();
    let prompt = new PromptRadio({
      name: "shellConfiguration",
      message:
        "Select a shell configuration key\n(Select with the spacebar, continue with enter)",
      default: "default",
      choices: configKeys,
      ui: readlineUi
    });
    return new Promise((resolve, reject) => {
      prompt.ask(selected => {
        if (selected) {
          resolve(selected);
        } else {
          reject("No configuration selected!");
        }
      });
    });
  }

  // look for all manifest.json files. if there is more than one, then prompt
  // for a choice.
  async function getManifestDir(applicationDir) {
    let directories = directoryTree(applicationDir, {
      extensions: /\.json/,
      exclude: /node_modules/
    });

    let foundDirectories = [];
    searchManifest(directories);

    function searchManifest(dirObject) {
      if ("children" in dirObject) {
        if (
          dirObject.children.reduce(
            (hasManifest, entry) =>
              hasManifest || entry.name === "manifest.json",
            false
          )
        ) {
          foundDirectories.push(dirObject.path);
        }
        dirObject.children.forEach(entry => searchManifest(entry));
      }
    }

    // no async array.filter yet :-(
    let manifestDirectories = [];
    for (let dir of foundDirectories) {
      try {
        let manifest = await fileSystem.readJson(
          path.join(dir, "manifest.json")
        );
        if (
          "sap.app" in manifest &&
          "type" in manifest["sap.app"] &&
          manifest["sap.app"].type === "application"
        ) {
          manifestDirectories.push(dir);
        }
      } catch (e) {}
    }

    try {
      return await getManifestDirectoryChoice(manifestDirectories);
    } catch (error) {
      logError(`${error}`);
    }
  }

  function getManifestDirectoryChoice(directories) {
    if (directories.length === 0) {
      throw new Error("No manifest.json found!");
    } else if (directories.length === 1) {
      logSuccess(`Manifest folder found: ${directories[0]}`);
      return directories[0];
    } else {
      logNewline();
      let prompt = new PromptRadio({
        name: "manifestDir",
        message:
          "Select the app directory\n(Select with the spacebar, continue with enter)",
        choices: directories,
        ui: readlineUi
      });
      return new Promise((resolve, reject) => {
        prompt.ask(selected => {
          if (selected) {
            resolve(selected);
          } else {
            reject("No directory selected!");
          }
        });
      });
    }
  }

  async function getOdataDir(applicationDir) {
    const oDataPath = path.join(applicationDir, "odata");
    const exists = await fileSystem.pathExists(oDataPath);
    if (exists) {
      logSuccess(`OData folder found: ${oDataPath}`);
      return oDataPath;
    } else {
      return null;
    }
  }

  async function getIndexHtmlPath(applicationDir): Promise<string> {
    let directories = directoryTree(applicationDir, {
      extensions: /\.html/,
      exclude: /node_modules/
    });

    let foundDirectories = [];
    search(directories);

    function search(dirObject) {
      if ("children" in dirObject) {
        if (
          dirObject.children.reduce(
            (found, entry) => found || entry.name === "index.html",
            false
          )
        ) {
          foundDirectories.push(dirObject.path);
        }
        dirObject.children.forEach(entry => search(entry));
      }
    }

    try {
      return await getIndexHtmlDirectoryChoice(foundDirectories);
    } catch (error) {
      logError(`${error}`);
    }
  }

  function getIndexHtmlDirectoryChoice(directories) {
    if (directories.length === 0) {
      return null;
    } else if (directories.length === 1) {
      logSuccess(`index.html found in: ${directories[0]}`);
      return directories[0];
    } else {
      logNewline();
      let prompt = new PromptRadio({
        name: "indexDir",
        message:
          "Select the index.html directory\n(Select with the spacebar, continue with enter)",
        choices: directories,
        ui: readlineUi
      });
      return new Promise((resolve, reject) => {
        prompt.ask(selected => {
          if (selected) {
            resolve(selected);
          } else {
            reject("No directory selected!");
          }
        });
      });
    }
  }
}
