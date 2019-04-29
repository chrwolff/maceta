import { Logger } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { Response, Request } from "express";
import { ServerConfiguration } from "./serverConfiguration.provider";
export declare class FileRouter {
    private readonly adapterHost;
    private configuration;
    private logger;
    constructor(adapterHost: HttpAdapterHost, configuration: ServerConfiguration, logger: Logger);
    shellConfig(res: Response): void;
    shell(request: Request, response: Response): Promise<void>;
    onModuleInit(): void;
    private resolveFile;
}
