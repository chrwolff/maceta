import { Response } from "express";
import { ConfigurationProvider } from "../configurationProvider";
export declare class SapRouter {
    private configuration;
    constructor(configuration: ConfigurationProvider);
    getLibrary(req: Request, res: Response): void;
    startUp(res: Response): void;
}
