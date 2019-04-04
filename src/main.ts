#!/usr/bin/env node
import { NestFactory } from "@nestjs/core";
import { ServerModule } from "./serverModule/serverModule";
import { ServerConfiguration } from "./configuration/serverConfiguration.provider";
import { Options } from "./configuration/configurationBase";
import { ConfigurationModule } from "./configuration/configuration.module";
import { CliConfiguration } from "./configuration/cliConfiguration.provider";
import { Logger } from "./logger";
import * as yargs from "yargs";

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

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

(() => {
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
  const options: Options = {};
  Object.keys(args)
    .filter(
      key => key in startConfigOptionTemplate || key in resourceOptionTemplate,
    )
    .forEach(key => (options[key] = args[key]));

  if (command.charAt(0) === "s") {
    startServer(options);
  } else if (command.charAt(0) === "c") {
    configure(options);
  } else if (command.charAt(0) === "r") {
    if (Object.keys(options).length) {
      //modifyResources(options);
    } else {
      //displayResources();
    }
  }
})();

async function configure(options: Options) {
  const app = await NestFactory.createApplicationContext(ConfigurationModule, {
    logger: false,
  });
  const configuration = app.get(CliConfiguration);
  configuration.saveOptions(options);
  configuration.displayConfiguration();
}

async function startServer(options: Options) {
  const app = await NestFactory.create(ServerModule, {
    logger: false,
  });
  const configuration = app.get(ServerConfiguration);
  const logger = app.get(Logger);

  try {
    configuration.setOptions(options);
    await configuration.determineLocaleConfiguration();
    configuration.checkAndSeal();
    logger.log(
      `Server starting at ${configuration.hostname}:${configuration.port}`,
    );
    await app.listenAsync(configuration.port, configuration.hostname);
  } catch (error) {
    logger.error(error);
    process.exit();
  }
}
