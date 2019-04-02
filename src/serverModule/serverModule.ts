import { Module } from "@nestjs/common";
import { SapRouter } from "./sapRouter";
import { ConfigurationProvider } from "../configurationProvider";

@Module({
  controllers: [SapRouter],
  providers: [ConfigurationProvider],
})
export class ServerModule {}
