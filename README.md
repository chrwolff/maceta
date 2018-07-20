## A testbed for SAP Fiori applications

[maceta](http://www.spanishdict.com/translate/maceta) is the Spanish word for flowerpot.

Reasons to use maceta:
- You want to develop UI5 applications on your favorite IDE
- You want to test immediately from your local machine, without time-consuming upload to a SAP system
- You don't want to upload to a SAP system for developer tests, because you are working on a team and avoiding code conflicts is error-prone
- You are working on shared libraries that you don't want to publish during development

## What you can expect
Enter ``maceta s`` in your UI5 application folder and maceta will figure out how to setup a local server:

```shell
PS C:\workspace\macetaTestApp> maceta s

Using C:\workspace\macetaTestApp as application path

Using maceta.config.json from C:\workspace\macetaTestApp

Manifest folder found: C:\workspace\macetaTestApp\app

OData folder found: C:\workspace\macetaTestApp\odata

Shell embedded mode started: http://localhost:3000/shell?sap-ushell-config=standalone&local-ushell-config=default&sap-language=en#Shell-runStandaloneApp
```

Your application will open in the default browser, either in shell embedded mode or by calling an ``index.html``.

## Installation
Maceta offers console commands to start your UI5 application from a local directory. It is therefore best to install the CLI tools globally:

```npm i -g maceta```

Download the official OpenUI5 or UI5 libraries:
- [OpenUI5](https://openui5.org/download.html)
- [UI5](https://tools.hana.ondemand.com/#sapui5)

Put the ``resources`` folder of the libraries somewhere on your local machine, then tell maceta about it:

```maceta config --ui5=abolutePathToUI5Libraries```

Example: Under Windows, when the ``resources`` folder is under ``C:\workspace\ui5-lib``, then the configuration must be set as

```maceta config --ui5=C:\workspace\ui5-lib```

Maceta will respond by printing out the current global configuration. You can also review the global configuration with the command ``maceta config``.

Other configuration options are the hostname and port for your applications. Example:

```maceta config --hostname=myhost --port=2000```

The standard values for hostname and port are ``localhost`` and ``3000``, respectively.

## Usage
You can get quick help on commands by adding the ``--h`` option to any command. E.g. ``maceta --h`` or ``maceta s --h``.

To start the maceta server on your local machine, change to your UI5 application directory. This directory should contain at least one UI5 ``manifest.json``. Start the server with ``maceta s``. Maceta will analyse your directory structure, starting with the current working directory, and perform the following steps

1. Search for ``maceta.config.json``. A local configuration file, that can overide the UI5 library path, configure mock OData services and setup the shell environment of your application.
2. If no shell environment is configured in ``maceta.config.json``, then maceta looks for ``index.html``. Any ``index.html`` has to contain correct UI5 bootstrap code to work properly.
3. If neither ``maceta.config.json`` nor ``index.html`` was found, then maceta will use a default shell environment configuration.
4. Search for ``manifest.json``. Needed to get the namespace id of your application and any non-SAP library dependencies.
5. If no OData directory was specified in ``maceta.config.json``, then search for the folder ``odata`` in the current working directory.
6. Start the application in the standard browser.

## Configuration
You can display the current global configuration with ``maceta c``. Global configuration settings are
- UI5 library path,
- hostname of the local server,
- port of the application

### maceta.config.json
You can put a local JSON configuration file into your UI5 project folder. It's name must be ``maceta.config.json``. Its basic structure is as follows
```json
{
  "ui5LibraryPath": "absolutePathToUI5Libraries",
  "oDataPath": "absolutePathToODataMockServer",
  "shell": {
    "default": {
      "languages": ["en", "pl", "de"]
    }
  }
}
```
The keys ``ui5LibraryPath``, ``oDataPath`` and ``shell`` are all optional. If you specify a shell configuration, then at least a ``default`` section has to be defined. This will start your application in shell embedded mode, with the specified languages in the language menu. The first language in the array is the selected language on application start.

### How to configure a mock OData service
OData mock services have to be defined in a file named ``service.js`` that can be put into an ``odata`` folder for auto-detection, or any folder that must then be defined in a ``maceta.config.json``. To create a mock server, the easiest way is to use the npm package ``odata-v4-server``.

The ``service.js`` has to export ``Server``, which is either a single OData server or an array of servers:
```ts
import { PostsController } from "./PostsController";
import { ODataServer, odata } from "odata-v4-server";

@odata.namespace("my.data")
@odata.controller(PostsController, true)
class PostsServer extends ODataServer {}

export const Server = [PostsServer];

//also valid when there is only one server to export
//export const Server = PostsServer;
```

### How to configure resource paths for non-SAP namespaces
*TBD*

## TODOs
- OData services of SAP backend server can be called
- CLI command to create local configuration file
- Libraries can be called from SAP backend server
- URL options can be configured
- Give control back to console after start
