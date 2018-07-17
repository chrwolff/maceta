#!/usr/bin/env node

const fileSystem = require("fs-extra");
const yargs = require("yargs");
const path = require("path");
const opn = require("opn");
const directoryTree = require("directory-tree");
const PromptRadio = require("prompt-radio");
const ConfirmPrompt = require("prompt-confirm");
const readlineUi = require("readline-ui").create();

process.env["NODE_CONFIG_DIR"] = path.join(__dirname, "..", "config");
const configFile = require("config");

import { ServerParameters, createServer } from "maceta-api";

const consoleColors = {
  reset: "\x1b[0m",
  success: "\x1b[32m",
  error: "\x1b[31m",
  warning: "\x1b[33m",
  default: "\x1b[37m",
  emphasize: "\x1b[1m"
};

// get arguments from CLI
const args = yargs.argv;

processConfig();

// the main processing function
async function processConfig() {
  const basePath = process.cwd();
  logSuccess(`\nUsing ${basePath} as application path`);
  // create a basic config for the project. assume the current working dir
  // as application directory.
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

  const macetaConfiguration: any = await getMacetaConfig(basePath);
  if ("ui5LibraryPath" in macetaConfiguration) {
    projectConfig.localLibraryPath = macetaConfiguration.ui5LibraryPath;
  }

  if (projectConfig.localLibraryPath == undefined) {
    logError("\nNo UI5 library path is configured!");
  }

  if ("oDataPath" in macetaConfiguration) {
    projectConfig.oDataPath = macetaConfiguration.oDataPath;
  }

  projectConfig.componentPath = await getManifestDir(basePath);

  let shellId;
  if ("shell" in macetaConfiguration) {
    shellId = await getShellId(macetaConfiguration.shell);
    projectConfig.shellConfiguration = true;
  } else {
    projectConfig.shellConfiguration = await createShellConfigPrompt();
  }

  // return input control from any prompt to the console
  readlineUi.close();

  // start the server
  const server = await createServer(projectConfig);
  if (configFile.has("resourcePath")) {
    const fileResources = configFile.get("resourcePath");
    Object.keys(fileResources).forEach(key =>
      server.createResourcePath({
        namespace: key,
        path: fileResources[key]
      })
    );
  }
  if ("shell" in macetaConfiguration) {
    if ("languages" in macetaConfiguration.shell) {
      server.setShellLanguages(macetaConfiguration.shell.languages);
    }
    if ("configurations" in macetaConfiguration.shell) {
      const configs = macetaConfiguration.shell.configurations;
      Object.keys(configs).forEach(key => {
        if (key !== "default") {
          server.createShellConfigurationKey(key);
        }
        if ("resourcePath" in configs[key]) {
          let rsPath = configs[key].resourcePath;
          Object.keys(rsPath).forEach(namespace =>
            server.createResourcePath({
              namespace,
              path: rsPath[namespace],
              shellConfigurationKey: key,
              sapServer: true
            })
          );
        }
      });
    }
  }

  const url = await server.start();

  if ("shell" in macetaConfiguration) {
    logSuccess(`\nShell embedded mode started: ${url}\n`);
  } else {
    logSuccess(`\nServer running at: ${url}\n`);
  }
  opn(url);
}

// look for index.html and shellConfig.json in the application directory.
// if both are found, then prompt for a choice.
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
    logError(`\n${error}`);
  }

  if (selectedDirectory == undefined) {
    return {};
  }

  try {
    return await fileSystem.readJson(
      path.join(selectedDirectory, "maceta.config.json")
    );
  } catch (e) {
    logError(`\n${e}`);
  }
}

function getMacetaDirectoryChoice(directories) {
  if (directories.length === 0) {
    logWarning("No maceta.config.json found!");
    return null;
  } else if (directories.length === 1) {
    logSuccess(`\nUsing maceta.config.json from ${directories[0]}`);
    return directories[0];
  } else {
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
        reject("No mode selected!");
      }
    });
  });
}

// read the shellConfig.json. if there are more options besides default
// then prompt for a choice.
async function getShellId(shellConfig: any): Promise<string> {
  try {
    if (
      "configurations" in shellConfig &&
      "default" in shellConfig.configurations
    ) {
      let configKeys = Object.keys(shellConfig.configurations);
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
      logError("\nshellConfig.json contains no default configuration!");
    }
  } catch (error) {
    logError("\nshellConfig.json not found!");
  }
}

function shellConfigIdPrompt(configKeys): Promise<string> {
  logNewline();
  let prompt = new PromptRadio({
    name: "shellConfiguration",
    message:
      "Select a shell configuration\n(Select with the spacebar, continue with enter)",
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
    logError(`\n${error}`);
  }
}

function getManifestDirectoryChoice(directories) {
  if (directories.length === 0) {
    throw new logError("No manifest.json found!");
  } else if (directories.length === 1) {
    logSuccess(`\nUsing manifest from ${directories[0]}`);
    return directories[0];
  } else {
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

function logNewline() {
  logSuccess("");
}

function logSuccess(text) {
  console.log(consoleColors.success, text, consoleColors.reset);
}

function logWarning(text) {
  console.log(consoleColors.warning, text, consoleColors.reset);
}

function logError(text) {
  console.log(consoleColors.error, text, consoleColors.reset);
  process.exit();
}
