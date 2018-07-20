const fileSystem = require("fs-extra");
const opn = require("opn");
const directoryTree = require("directory-tree");
const PromptRadio = require("prompt-radio");
const ConfirmPrompt = require("prompt-confirm");
const readlineUi = require("readline-ui").create();
const path = require("path");

process.env["NODE_CONFIG_DIR"] = path.join(__dirname, "..", "config");
const configFile = require("config");

import { logSuccess, logError, logNewline, logWarning } from "./consoleOutput";
import { ServerParameters, createServer } from "maceta-api";

export async function startServer(options) {
  const basePath = process.cwd();
  logSuccess(`Using ${basePath} as application path`);

  let projectConfig: ServerParameters = {
    componentPath: null,
    oDataPath: configFile.has("oDataPath") ? configFile.get("oDataPath") : null,
    shellConfiguration: false,
    localLibraryPath: configFile.has("ui5LibraryPath")
      ? configFile.get("ui5LibraryPath")
      : null,
    hostname: configFile.get("hostname"),
    port: configFile.get("port")
  };

  Object.keys(options).forEach(key => (projectConfig[key] = options[key]));

  const macetaConfiguration: any = await getMacetaConfig(basePath);
  if ("ui5LibraryPath" in macetaConfiguration) {
    projectConfig.localLibraryPath = macetaConfiguration.ui5LibraryPath;
  }

  if (projectConfig.localLibraryPath == undefined) {
    logError("No UI5 library path is configured!");
  }

  let shellId = null;
  let indexHtmlPath;
  if ("shell" in macetaConfiguration) {
    shellId = await getShellId(macetaConfiguration.shell);
    projectConfig.shellConfiguration = true;
  } else {
    indexHtmlPath = await getIndexHtmlPath(basePath);
    if (indexHtmlPath === null) {
      logWarning("No index.html found");
      logSuccess("Using default shell configuration");
      projectConfig.shellConfiguration = true;
    } else {
      projectConfig.basePath = indexHtmlPath;
    }
  }

  projectConfig.componentPath = await getManifestDir(basePath);

  if ("oDataPath" in macetaConfiguration) {
    projectConfig.oDataPath = macetaConfiguration.oDataPath;
  } else {
    const oDataPath = await getOdataDir(basePath);
    if (oDataPath != undefined) {
      projectConfig.oDataPath = oDataPath;
    }
  }

  // return input control from any prompt to the console
  readlineUi.close();

  // start the server
  try {
    const server = await createServer(projectConfig);
    if (configFile.has("resourceMap")) {
      const fileResources = configFile.get("resourceMap");
      Object.keys(fileResources).forEach(key =>
        server.createResourcePath({
          namespace: key,
          path: fileResources[key]
        })
      );
    }
    if ("shell" in macetaConfiguration) {
      const configs = macetaConfiguration.shell;
      Object.keys(configs).forEach(key => {
        if (key !== "default") {
          server.createShellConfigurationKey(key);
        }
        if ("languages" in configs[key]) {
          server.setShellLanguages(configs[key].languages);
        }
        if ("resourceMap" in configs[key]) {
          let rsPath = configs[key].resourcePath;
          Object.keys(rsPath).forEach(namespace =>
            server.createResourcePath({
              namespace,
              path: rsPath[namespace]
              //shellConfigurationKey: key,
              //sapServer: true
            })
          );
        }
      });
      if (shellId != undefined) {
        server.setShellConfigurationKey(shellId);
      }
    }

    let url = await server.start();

    if ("shell" in macetaConfiguration) {
      logSuccess(`Shell embedded mode started: ${url}\n`);
    } else {
      url = `${url}index.html`;
      logSuccess(`Server running at: ${url}\n`);
    }
    opn(url);
  } catch (e) {
    logError(e);
  }
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

function createShellConfigPrompt(): Promise<boolean> {
  logNewline();
  let prompt = new ConfirmPrompt({
    name: "createShellConfigPrompt",
    message: "Do you want to create a temporary default shell configuration?",
    ui: readlineUi
  });
  return new Promise((resolve, reject) => {
    prompt.ask(selected => {
      if (typeof selected === "boolean") {
        resolve(selected);
      } else {
        reject("Nothing selected!");
      }
    });
  });
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
          (hasManifest, entry) => hasManifest || entry.name === "manifest.json",
          false
        )
      ) {
        foundDirectories.push(dirObject.path);
      }
      dirObject.children.forEach(entry => searchManifest(entry));
    }
  }

  try {
    return await getManifestDirectoryChoice(foundDirectories);
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
