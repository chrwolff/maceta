import { Module } from "@nestjs/common";
import { SapRouter } from "./sapRouter.controller";
import { ServerConfiguration } from "./serverConfiguration.provider";
import { FileRouter } from "./fileRouter.controller";
import { Logger } from "@nestjs/common";
import { ODataRouter } from "./odataRouter.controller";

@Module({
  controllers: [SapRouter, FileRouter, ODataRouter],
  providers: [ServerConfiguration, Logger]
})
export class ServerModule {}
