import { Module } from "@nestjs/common";
import { SapRouter } from "./sapRouter";
import { ServerConfiguration } from "../configuration/serverConfiguration.provider";
import { ConfigurationBase } from "../configuration/configurationBase";
import { Logger } from "../logger";

const PersistedConfiguration = ConfigurationBase.getGlobalConfiguration();

@Module({
  controllers: [SapRouter],
  providers: [ServerConfiguration, PersistedConfiguration, Logger],
})
export class ServerModule {}
