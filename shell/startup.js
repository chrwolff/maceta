(function() {
  // this hook is called after bootstrap finishes
  window["sap.ushell.bootstrap.callback"] = function() {
    // this hook is called when the fiori2 renderer is instantiated (Shell.controller.js -> _resolveHashFragment)
    window["sap-ushell-async-libs-promise-directstart"] = new Promise(main);
  };

  function main(resolve, reject) {
    const DEFAULT = "default";

    // get parameter local-ushell-config from URL
    let urlParams = new URLSearchParams(window.location.search);
    let additionalShellConfig = urlParams.get("local-ushell-config");

    // read the shell config file
    $.getJSON("/shellConfig")
      .done(processConfig)
      .fail((jqxhr, textStatus, error) => {
        var err = textStatus + ", " + error;
        reject(new Error("Request Failed: " + err));
      });

    function processConfig(originalConfig) {
      if (!originalConfig[DEFAULT]) {
        throw Error("No default shell configuration found!");
      }

      // clone the configuration
      let appConfig = Object.assign({}, originalConfig[DEFAULT].app);
      let resourcePath = {};
      if (originalConfig[DEFAULT].resourcePath) {
        resourcePath = Object.assign({}, originalConfig[DEFAULT].resourcePath);
      }

      if (!appConfig.ui5ComponentName) {
        throw Error("No ui5ComponentName found in shellConfig!");
      }

      // if a non-default shell configuration was given, then merge it with the default
      if (additionalShellConfig && additionalShellConfig !== DEFAULT) {
        if (!originalConfig[additionalShellConfig]) {
          throw Error(
            `Configuration key ${additionalShellConfig} not found in shell configuration`
          );
        }
        if (originalConfig[additionalShellConfig].app) {
          appConfig = Object.assign(
            appConfig,
            originalConfig[additionalShellConfig].app
          );
        }
        if (originalConfig[additionalShellConfig].resourcePath) {
          resourcePath = Object.assign(
            resourcePath,
            originalConfig[additionalShellConfig].resourcePath
          );
        }
      }

      // set language from url parameter sap-language, or first entry in shell config language list
      let languageCodes = getLanguageCodes(appConfig);
      let currentLanguage = urlParams.get("sap-language") || languageCodes[0];
      currentLanguage = currentLanguage.toLowerCase();

      // resource path for the component is mapped to a file by default
      resourcePath[appConfig.ui5ComponentName] = resourcePath[
        appConfig.ui5ComponentName
      ] || { file: true };

      // register resource paths
      Object.keys(resourcePath).forEach(namespace => {
        var slashName = namespace.replace(/\./g, "/");
        var url = resourcePath[namespace].file
          ? slashName
          : resourcePath[namespace].path;
        jQuery.sap.registerResourcePath(slashName, {
          url,
          final: true
        });
      });

      // create full configuration object
      appConfig.additionalInformation =
        "SAPUI5.Component=" + appConfig.ui5ComponentName;
      appConfig.applicationType = "URL";
      appConfig.navigationMode = "embedded";
      if ("urlParameters" in appConfig) {
        var urlParameters = appConfig.urlParameters;
        appConfig.url = Object.keys(urlParameters).reduce(function(
          parameterString,
          key
        ) {
          return parameterString + key + "=" + urlParameters[key] + "&";
        },
        "?");
        delete appConfig.urlParameters;
      }

      sap.ui.getCore().applyTheme("sap_belize_plus");

      function startRendering() {
        if (sap.ushell.Container) {
          sap.ushell.Container.createRenderer("fiori2").placeAt("canvas");
          startApp();
          return;
        }
        jQuery.sap.delayedCall(100, self, startRendering);
      }

      function startApp() {
        // create the component and resolve the promise
        let ui5ComponentLoader = sap.ushell.Container.getService(
          "Ui5ComponentLoader"
        );
        if (ui5ComponentLoader) {
          ui5ComponentLoader
            .createComponent(appConfig)
            .done(function(configWithComponentHandle) {
              resolve({
                resolvedHashFragment: configWithComponentHandle
              });
            });
          doTasksAfterApplicationStart();
          return;
        }
        jQuery.sap.delayedCall(100, self, startApp);
      }

      function doTasksAfterApplicationStart() {
        let lifeCycleService = sap.ushell.Container.getService("AppLifeCycle");
        if (typeof lifeCycleService.getCurrentApplication() !== "undefined") {
          createLanguageMenu(languageCodes, currentLanguage);
          setLanguage(currentLanguage, false);
          return;
        }
        jQuery.sap.delayedCall(100, self, doTasksAfterApplicationStart);
      }

      startRendering();
    }
  }

  // return all languages from the app config as array. insert "en" as default,
  // if the configuration is missing in the shell config.
  function getLanguageCodes(appConfig) {
    var languageCodes = [];
    if ("languages" in appConfig) {
      if (typeof appConfig.languages === "string") {
        languageCodes.push(appConfig.languages);
      } else if (appConfig.languages instanceof Array) {
        languageCodes = appConfig.languages.filter(function(entry) {
          return typeof entry === "string";
        });
      }
    }

    languageCodes = languageCodes.map(function(entry) {
      return entry.toLowerCase();
    });

    if (languageCodes.length === 0) {
      languageCodes.push("en");
    }
    return languageCodes;
  }

  // insert button for language selection into shell menu, if the shell has
  // the necessary functionality
  function createLanguageMenu(languageCodes, currentLanguage) {
    let shellRenderer = sap.ushell.Container.getRenderer();
    if (typeof shellRenderer.addActionButton === "function") {
      addLanguageMenuToShell();
    }

    shellRenderer.hideHeaderItem("backBtn");

    // get a list of all language descriptions in english
    var englishLocale = new sap.ui.core.Locale("en");
    var englishLocaleData = new sap.ui.core.LocaleData(englishLocale);
    var languageDescriptions = englishLocaleData.getLanguages();

    if (!languageCodes.includes(currentLanguage)) {
      languageCodes.push(currentLanguage);
    }

    // create a JSON model from all available languages
    languageCodes.sort();
    var languageData = languageCodes.map(function(languageKey) {
      var languageDescription = languageDescriptions[languageKey] || null;
      return {
        languageKey: languageKey,
        description: languageDescription || "Not a valid language key!",
        selected: languageKey === currentLanguage,
        notValid: !languageDescription
      };
    });
    var languageModel = new sap.ui.model.json.JSONModel(languageData);

    // add the button to shell menu, once the application is available
    function addLanguageMenuToShell() {
      shellRenderer.addHeaderItem(
        {
          id: "languageMenuButton",
          icon: "sap-icon://globe",
          tooltip: "Language",
          press: showLanguageDialog
        },
        true,
        true
      );
    }

    function showLanguageDialog() {
      getDialog().open();
    }

    // closure for the language dialog
    var getDialog = (function() {
      var dialog = null;
      return function() {
        if (dialog === null) {
          var list = new sap.m.ListBase({
            mode: sap.m.ListMode.SingleSelectMaster,
            selectionChange: onSelectionChange,
            items: {
              path: "languageModel>/",
              factory: languageItemfactory
            }
          });
          list.setModel(languageModel, "languageModel");
          dialog = new sap.m.Dialog({
            title: "Language Selection",
            content: list
          });
          var cancelButton = new sap.m.Button({
            text: "Cancel",
            press: dialog.close.bind(dialog)
          });
          dialog.setEndButton(cancelButton);
        }
        return dialog;
      };
    })();

    // factory for language list items
    function languageItemfactory() {
      var item = new sap.m.StandardListItem({
        title: "{languageModel>description}",
        description: "{languageModel>languageKey}",
        info: {
          path: "languageModel>selected",
          formatter: function(selected) {
            return selected ? "Active" : "";
          }
        },
        infoState: sap.ui.core.ValueState.Success,
        icon: {
          path: "languageModel>notValid",
          formatter: function(notValid) {
            return notValid ? "sap-icon://message-warning" : null;
          }
        }
      });

      return item;
    }

    // listener for language item selection
    function onSelectionChange(event) {
      var source = event.getSource();
      var context = source.getSelectedContexts()[0];
      var language = context.getProperty("languageKey");
      setLanguage(language, true);
      source.removeSelections();
      getDialog().close();
    }
  }

  // closure for the currently set language
  var setLanguage = (function() {
    var currentLanguage = null;
    return function(language, reload) {
      if (language !== currentLanguage) {
        currentLanguage = language;
        if (reload) {
          // if reload is required, then replace the current sap-language
          // with the selected language
          let urlParams = new URLSearchParams(window.location.search);
          urlParams.delete("sap-language");
          urlParams.append("sap-language", currentLanguage);
          var url = `${location.protocol}//${location.host}${
            location.pathname
          }?${urlParams.toString()}${location.hash}`;
          window.location.replace(url);
        } else {
          // after (re)load, just set the application language
          var applicationConfiguration = sap.ui.getCore().getConfiguration();
          applicationConfiguration.setLanguage(currentLanguage);
          applicationConfiguration.setFormatLocale(currentLanguage);
        }
      }
    };
  })();
})();
