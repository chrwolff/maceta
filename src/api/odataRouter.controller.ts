import { Controller, Logger } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { ServerConfiguration } from "./serverConfiguration.provider";
import * as directoryTree from "directory-tree";

const ODATA_BASE_PATH = "/sap/opu/odata/";

@Controller()
export class ODataRouter {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private configuration: ServerConfiguration,
    private logger: Logger
  ) {}

  onModuleInit() {
    if (!this.configuration.oDataPath) {
      return;
    }

    const metadataFiles = directoryTree(this.configuration.oDataPath, {
      extensions: /\.js/
    });

    metadataFiles.children
      .filter(child => child.name === "service.js")
      .forEach(child => {
        let service = require(child.path);
        if ("Server" in service) {
          let serverArray = Array.isArray(service.Server)
            ? service.Server
            : [service.Server];

          serverArray
            .filter(
              server =>
                "create" in server &&
                typeof server.create === "function" &&
                "namespace" in server &&
                typeof server.namespace === "string"
            )
            .forEach(server => {
              // more than one schema possible in SAP definition?
              // special SAP schema?
              // namespace identical with service name?
              let namespace = server.namespace.split(".").join("/");
              let odataPath = `${ODATA_BASE_PATH}${namespace}`;
              this.adapterHost.httpAdapter.use(odataPath, server.create());
            });
        }
      });
  }
}
