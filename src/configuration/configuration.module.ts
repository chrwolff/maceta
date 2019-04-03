import { Module } from "@nestjs/common";
import { CliConfiguration } from "./cliConfiguration.provider";
import { ConfigurationBase } from "../configuration/configurationBase";
import { Logger } from "../logger";

const PersistedConfiguration = ConfigurationBase.getPersistedConfiguration();

@Module({
  providers: [CliConfiguration, PersistedConfiguration, Logger],
})
export class ConfigurationModule {}
