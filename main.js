const fileSystem = require("fs-extra");
const minimist = require("minimist");
const path = require("path");
const opn = require("opn");
const directoryTree = require("directory-tree");
const PromptRadio = require("prompt-radio");
const startUp = require("./modules/serverMain.js");
const readlineUi = require("readline-ui").create();

const consoleColors = {
  reset: "\x1b[0m",
  success: "\x1b[32m",
  error: "\x1b[31m",
  warning: "\x1b[33m",
  default: "\x1b[37m",
  emphasize: "\x1b[1m"
};

// get arguments from CLI
const args = minimist(process.argv.slice(2));

// start the whole process by reading the config file
fileSystem.readFile(
  path.join(__dirname, "config.json"),
  "utf8",
  processConfig
);

// the main processing function
async function processConfig(err, data) {
  if (err) {
    logError("\n" + err);
  }

  let defaultConfig = JSON.parse(data);

  // create a basic config for the project. assume the current working dir
  // as application directory.
  let projectConfig = { resourceMap: {}, basePath: process.cwd() };

  logSuccess(`\nUsing ${projectConfig.basePath} as application path\n`);

  if (args.shellConfig) {
    // if shellConfig was supplied as parameter
    projectConfig.shellConfig = args.shellConfig;
    projectConfig.browser = "shell";
    logSuccess(
      `\nShell configuration ${projectConfig.shellConfig} was supplied\n`
    );
  } else {
    // determine the configuration parameters automatically or from REPL
    projectConfig.browser = await getBrowserOption(projectConfig.basePath);
    logSuccess(`\nStarting in browser mode: ${projectConfig.browser}\n\n`);
    if (projectConfig.browser === "shell") {
      projectConfig.shellConfig = await getShellConfig(projectConfig.basePath);
      logSuccess(
        `\nShell configuration ${projectConfig.shellConfig} selected\n\n`
      );
    }
  }

  if (projectConfig.browser === "shell") {
    projectConfig.resourceMap = await getResourceMap(projectConfig.basePath);
  }

  // return input control from any prompt to the console
  readlineUi.close();

  defaultConfig.resourcePath = defaultConfig.resourcePath || ".";
  defaultConfig.resourceMap = defaultConfig.resourceMap || {};
  // make the resource paths absolute
  Object.keys(defaultConfig.resourceMap).forEach(key => {
    const mapPath = defaultConfig.resourceMap[key];
    if (!path.isAbsolute(mapPath)) {
      defaultConfig.resourceMap[key] = path.join(
        __dirname,
        defaultConfig.resourcePath,
        mapPath
      );
    }
  });

  // create the final config object
  var config = Object.assign({}, defaultConfig, projectConfig);
  config.resourceMap = Object.assign(
    {},
    defaultConfig.resourceMap,
    projectConfig.resourceMap
  );

  config.credentials = "challenge";
  config.babelJit = false;
  config.sapDataUrl = config.sapSystem;
  config.sapLibUrl = config.sapSystem;

  // start the server
  startUp({ configuration: config }).then(function({
    baseUrl,
    indexUrl,
    shellUrl
  }) {
    if (config.browser === "shell") {
      logSuccess(`\nShell embedded mode started: ${shellUrl}\n`);
      opn(shellUrl);
    } else if (config.browser === "index") {
      logSuccess(`\nServer running and index.html called: ${indexUrl}\n`);
      opn(indexUrl);
    } else {
      logSuccess(`\nServer running at: ${baseUrl}\n`);
    }
  });
}

// look for index.html and shellConfig.json in the application directory.
// if both are found, then prompt for a choice.
async function getBrowserOption(applicationDir) {
  let indexExists = await fileSystem.pathExists(
    path.join(applicationDir, "index.html")
  );
  let shellExists = await fileSystem.pathExists(
    path.join(applicationDir, "shellConfig.json")
  );

  let browserOption = "no";
  if (indexExists && shellExists) {
    try {
      browserOption = await browserOptionPrompt();
    } catch (error) {
      logError(error);
    }
  } else if (shellExists) {
    browserOption = "shell";
  } else if (indexExists) {
    browserOption = "index";
  }

  return browserOption;
}

function browserOptionPrompt() {
  let prompt = new PromptRadio({
    name: "browserOption",
    message:
      "Start index.html or shell embedded mode?\n(Select with the spacebar, continue with enter)",
    default: "index.html",
    choices: ["index.html", "Shell embedded"],
    ui: readlineUi
  });
  return new Promise((resolve, reject) => {
    prompt.ask(selected => {
      if (selected === "index.html") {
        resolve("index");
      } else if (selected === "Shell embedded") {
        resolve("shell");
      } else {
        reject("No mode selected!");
      }
    });
  });
}

// read the shellConfig.json. if there are more options beside default,
// then prompt for a choice.
async function getShellConfig(applicationDir) {
  try {
    let shellConfig = await fileSystem.readJson(
      path.join(applicationDir, "shellConfig.json")
    );
    if ("default" in shellConfig) {
      let configKeys = Object.keys(shellConfig);
      if (configKeys.length === 1) {
        return configKeys[0];
      } else {
        try {
          return await shellConfigPrompt(configKeys);
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

function shellConfigPrompt(configKeys) {
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

// look for all manifest.json files. if there is more than one, than prompt
// for a choice. Then read the appId form the manifest.json and map it to
// the selected path.
async function getResourceMap(applicationDir) {
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
    let manifestDirectory = await getDirectoryChoice(foundDirectories);
    try {
      let manifest = await fileSystem.readJson(
        path.join(manifestDirectory, "manifest.json")
      );
      let componentId = manifest["sap.app"].id;
      let resourceMap = {};
      resourceMap[componentId] = manifestDirectory + "/";
      return resourceMap;
    } catch (error) {
      logError("\nmanifest.json corrupted or no app id found!");
    }
  } catch (error) {
    logError(`\n${error}`);
  }
}

function getDirectoryChoice(directories) {
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

function logSuccess(text) {
  console.log(consoleColors.success, text, consoleColors.reset);
}

function logError(text) {
  console.log(consoleColors.error, text, consoleColors.reset);
  process.exit();
}
