// src/lib/i18n.ts
import * as Localization from "expo-localization";
import { I18n } from "i18n-js";

import en from "../locales/en.json";
import fr from "../locales/fr.json";

const i18n = new I18n({
  en,
  fr,
});

const locales = Localization.getLocales();
i18n.locale = locales[0].languageCode || "en";

i18n.enableFallback = true;

export default i18n;
