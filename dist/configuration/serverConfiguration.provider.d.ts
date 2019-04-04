import { ConfigurationBase, Options } from "./configurationBase";
import { IConfig } from "config";
import { Logger } from "../logger";
export declare enum Exceptions {
    PORT_WRONG = "Port not configured correctly",
    HOSTNAME_WRONG = "Hostname not configured correctly",
    LIBRARY_WRONG = "UI5 library path not configured correctly",
    IS_SEALED = "Configuration cannot be changed after first get"
}
export declare class ServerConfiguration extends ConfigurationBase {
    private logger;
    private options;
    readonly resourceMap: {
        [key: string]: string;
    };
    private isChecked;
    private readlineUi;
    constructor(config: IConfig, logger: Logger);
    readonly hostname: string;
    readonly port: number;
    readonly ui5LibraryPath: string;
    setOptions(options: Options): void;
    checkAndSeal(): void;
    determineLocaleConfiguration(withInteraction?: boolean): Promise<void>;
    private getLocalConfiguration;
    private getMacetaDirectoryChoice;
    private getManifestDir;
    private getManifestDirectoryChoice;
}
