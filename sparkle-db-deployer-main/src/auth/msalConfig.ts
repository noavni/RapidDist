import { Configuration, LogLevel } from "@azure/msal-browser";
import { aadClientId, aadScope, aadTenantId, redirectUri } from "@/lib/config";

export const msalConfig: Configuration = {
  auth: {
    clientId: aadClientId,
    authority: `https://login.microsoftonline.com/${aadTenantId}`,
    redirectUri,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
          case LogLevel.Info:
            console.info(message);
            break;
          default:
            break;
        }
      },
    },
  },
};

export const loginRequest = {
  scopes: [aadScope],
};
