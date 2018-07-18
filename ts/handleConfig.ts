const fileSystem = require("fs-extra");
const path = require("path");

process.env["NODE_CONFIG_DIR"] = path.join(__dirname, "..", "config");
const mergedConfiguration = require("config");

export async function saveConfig(options): Promise<void> {
  // load current config
  const configPath = path.join(__dirname, "..", "config", "local.json");
  let configuration;
  try {
    configuration = await fileSystem.readJson(configPath);
  } catch (e) {
    configuration = {};
  }

  // overwrite with new values
  Object.keys(options).forEach(key => {
    configuration[key] = options[key];
    mergedConfiguration[key] = options[key];
  });

  // save config
  await fileSystem.writeJson(configPath, configuration);
  configToConsole(mergedConfiguration);
}

export function displayConfig() {
  configToConsole(mergedConfiguration);
}

function configToConsole(configuration) {
  console.log("\nCurrent maceta configuration");
  Object.keys(configuration).forEach(key =>
    console.log(`${key}: ${configuration[key]}`)
  );
  console.log();
  process.exit();
}
