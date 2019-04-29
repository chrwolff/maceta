export declare enum Exceptions {
    BASE_PATH_WRONG = "Base path not configured correctly",
    COMPONENT_PATH_WRONG = "Component path not configured correctly",
    ODATA_PATH_WRONG = "OData path not configured correctly",
    PORT_WRONG = "Port not configured correctly",
    HOSTNAME_WRONG = "Hostname not configured correctly",
    LIBRARY_WRONG = "UI5 library path not configured correctly",
    IS_SEALED = "Configuration cannot be changed after first get",
    MANIFEST_NO_ID = "Manifest contains no id"
}
export interface ConfigurationOptions {
    ui5LibraryPath: string;
    basePath: string;
    componentPath: string;
    oDataPath?: string;
    hostname: string;
    port: number;
    shellEmbedded: boolean;
}
export interface Resource {
    namespace: string;
    path: string;
    shellConfigurationKey?: string;
    sapServer?: boolean;
}
declare type ResourceMap = Map<string, string>;
interface ResourcePathEntry {
    file: boolean;
    path?: string;
}
interface ResourcePath {
    [key: string]: ResourcePathEntry;
}
interface ShellConfiguration {
    [key: string]: {
        app?: {
            ui5ComponentName: string;
            languages: string[];
        };
        resourcePath: ResourcePath;
    };
}
export declare class ServerConfiguration {
    private configuration;
    private resources;
    private shellConfig;
    private isChecked;
    constructor();
    readonly hostname: string;
    readonly port: number;
    readonly ui5LibraryPath: string;
    readonly basePath: string;
    readonly componentPath: string;
    readonly shellConfiguration: ShellConfiguration;
    readonly resourceMap: ResourceMap;
    readonly oDataPath: string;
    setOptions(options: ConfigurationOptions, resources?: Resource[]): void;
    checkAndSeal(): void;
    private createResourcePath;
    getAbsoluteNormalizedPath(filePath: string): string;
    private pathExists;
}
export {};
