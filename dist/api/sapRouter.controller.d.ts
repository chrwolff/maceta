import { Response } from "express";
import { ServerConfiguration } from "./serverConfiguration.provider";
import { Logger } from "@nestjs/common";
export declare class SapRouter {
    private configuration;
    private logger;
    constructor(configuration: ServerConfiguration, logger: Logger);
    getLibrary(req: Request, res: Response): Promise<void>;
    startUp(res: Response): void;
}
