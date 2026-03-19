import { I18n } from 'i18n-js';

import en from '@/locales/en';
import es from '@/locales/es';

const i18n = new I18n({ en, es });
i18n.enableFallback = true;
i18n.defaultLocale = 'en';
i18n.locale = 'en';

export default i18n;
