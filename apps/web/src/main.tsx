import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HedgelingProvider } from "@hedgeling/i18n/runtime";
import App from "./App";
import { canReadLocaleStorage } from "./localeStorage";
import "./index.css";

const SUPPORTED_LOCALES = [
  "en-US",
  "en-GB",
  "en-AU",
  "en-CA",
  "fr-CA",
  "en-IN",
  "hi-IN",
  "nl-NL",
  "sv-SE",
  "pl-PL",
  "uk-UA",
  "ru-RU",
  "es-ES",
  "pt-BR",
  "ar-SA",
];

const application = <BrowserRouter><App /></BrowserRouter>;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {canReadLocaleStorage() ? (
    <HedgelingProvider
      sourceLocale="en-US"
      supportedLocales={SUPPORTED_LOCALES}
      languageStorageKey="hedgeling.locale"
      bundleUrl="/hedgeling-bundle.json"
      sourceKeyMapUrl="/hedgeling-source-key-map.json"
    >
      {application}
    </HedgelingProvider>
    ) : application}
  </React.StrictMode>
);
