import { Logger } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { ServerConfiguration } from "./serverConfiguration.provider";
export declare class ODataRouter {
    private readonly adapterHost;
    private configuration;
    private logger;
    constructor(adapterHost: HttpAdapterHost, configuration: ServerConfiguration, logger: Logger);
    onModuleInit(): void;
}
