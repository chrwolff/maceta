import { ConfigurationBase, Options } from "./configurationBase";
import { IConfig } from "config";
import { Logger } from "../logger";
export declare class CliConfiguration extends ConfigurationBase {
    private logger;
    readonly resourceMap: {
        [key: string]: string;
    };
    constructor(config: IConfig, logger: Logger);
    saveOptions(options: Options): Promise<void>;
    displayConfiguration(): void;
}
