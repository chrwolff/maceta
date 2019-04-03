import { Response } from "express";
import { ServerConfiguration } from "../configuration/serverConfiguration.provider";
import { Logger } from "../logger";
export declare class SapRouter {
    private configuration;
    private logger;
    constructor(configuration: ServerConfiguration, logger: Logger);
    getLibrary(req: Request, res: Response): void;
    startUp(res: Response): void;
}
