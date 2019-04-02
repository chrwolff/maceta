const fileSystem = require("fs-extra");
const path = require("path");
var Prompt = require("prompt-base");
import { logError, logNewline, logWarning, logSuccess } from "./consoleOutput";

process.env["NODE_CONFIG_DIR"] = path.join(__dirname, "..", "config");
const mergedConfiguration = require("config");

export async function modifyResources(options) {
  if ("namespace" in options) {
    let dir;
    if ("delete" in options && options.delete) {
      dir = null;
    } else {
      try {
        dir = await requestPath();
      } catch (e) {
        logError("Aborting");
      }
    }
    saveConfig(options.namespace, dir);
  } else {
    logError("No namespace given!");
  }
}

function requestPath() {
  const question = new Prompt({
    name: "directory",
    message: "Absolute path to resource directory (abort with blank input): ",
  });
  return new Promise((resolve, reject) => {
    question.ask((answer: string) => {
      if (answer.trim()) {
        resolve(path.normalize(answer));
      } else {
        reject();
      }
    });
  });
}

async function saveConfig(namespace, dir): Promise<void> {
  // load current config
  const configPath = path.join(__dirname, "..", "config", "local.json");
  let configuration;
  try {
    configuration = await fileSystem.readJson(configPath);
  } catch (e) {
    configuration = {};
  }

  if (!("resourceMap" in configuration)) {
    configuration.resourceMap = {};
    mergedConfiguration.resourceMap = {};
  }

  // overwrite with new values
  if (dir == undefined) {
    if (namespace in configuration.resourceMap) {
      logWarning(`Mapping for namespace ${namespace} deleted`);
      delete configuration.resourceMap[namespace];
      delete mergedConfiguration.resourceMap[namespace];
    }
  } else {
    configuration.resourceMap[namespace] = dir;
    mergedConfiguration.resourceMap[namespace] = dir;
  }

  // save config
  await fileSystem.writeJson(configPath, configuration);
  configToConsole(mergedConfiguration);
}

export function displayResources() {
  configToConsole(mergedConfiguration);
}

function configToConsole(configuration) {
  if (
    "resourceMap" in configuration &&
    Object.keys(configuration.resourceMap).length
  ) {
    logSuccess("Current global resources configuration");
    Object.keys(configuration.resourceMap).forEach(key =>
      console.log(`${key}: ${configuration.resourceMap[key]}`),
    );
  } else {
    logWarning("No resources configured yet");
  }
  logNewline();
  process.exit();
}
