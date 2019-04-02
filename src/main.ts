#!/usr/bin/env node
import { NestFactory } from "@nestjs/core";
import { ServerModule } from "./serverModule/serverModule";
import { ConfigurationProvider } from "./configurationProvider";
import { Logger } from "@nestjs/common";

(async () => {
  const app = await NestFactory.create(ServerModule);
  const configuration = app.get(ConfigurationProvider);
  Logger.log(
    `Server starting at ${configuration.localHostname}:${
      configuration.localPort
    }`,
  );
  try {
    await app.listenAsync(configuration.localPort, configuration.localHostname);
  } catch (e) {
    Logger.error(e);
  }
})();
