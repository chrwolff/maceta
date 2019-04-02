import { startServer } from "./startServer";
import { saveConfig, displayConfig } from "./handleConfig";
import { modifyResources, displayResources } from "./handleResources";
import * as yargs from "yargs";

const startConfigOptionTemplate: yargs.CommandBuilder = {
  ui5LibraryPath: {
    alias: "ui5",
    type: "string",
    desc: "Absolute path to UI5 library",
  },
  hostname: {
    alias: "h",
    type: "string",
    desc: "Hostname for the local server",
  },
  port: {
    alias: "p",
    type: "number",
    desc: "Port for the application",
  },
};

const resourceOptionTemplate: yargs.CommandBuilder = {
  namespace: {
    alias: "n",
    type: "string",
    desc: "Namespace that shall be configured",
  },
  delete: {
    alias: "d",
    type: "boolean",
    desc: "Delete configuration of the given namespace",
  },
};

const args = yargs
  .scriptName("maceta")
  .command(
    ["start [option]", "s"],
    "Start maceta in current working directory",
    startConfigOptionTemplate,
  )
  .command(
    ["config [option]", "c"],
    "Set global configuration options",
    startConfigOptionTemplate,
  )
  .command(
    ["resource [options]", "r"],
    "Edit global resource mappings (namespaces)",
    resourceOptionTemplate,
  )
  .demandCommand(1, 1)
  .hide("version")
  .help()
  .strict().argv;

const command: string = args._[0];
const options = {};
Object.keys(args)
  .filter(
    key => key in startConfigOptionTemplate || key in resourceOptionTemplate,
  )
  .forEach(key => (options[key] = args[key]));

if (command.charAt(0) === "s") {
  startServer(options);
} else if (command.charAt(0) === "c") {
  if (Object.keys(options).length) {
    saveConfig(options);
  } else {
    displayConfig();
  }
} else if (command.charAt(0) === "r") {
  if (Object.keys(options).length) {
    modifyResources(options);
  } else {
    displayResources();
  }
}
