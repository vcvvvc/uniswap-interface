import i18n from 'i18next'
import resourcesToBackend from 'i18next-resources-to-backend'
import { initReactI18next } from 'react-i18next'
import enUsLocale from 'uniswap/src/i18n/locales/source/en-US.json'
import { logger } from 'utilities/src/logger/logger'

let isSetup = false

setupi18n()

export function setupi18n(): undefined {
  if (isSetup) {
    return
  }
  isSetup = true

  i18n
    .use(initReactI18next)
    .use(
      resourcesToBackend((language: string) => {
        // not sure why but it tries to load es THEN es-ES, for any language, but we just want the second
        if (!language.includes('-')) {
          return
        }
        if (language === 'en-US') {
          return enUsLocale
        }
        // eslint-disable-next-line no-unsanitized/method
        return import(`./locales/translations/${language}.json`)
      }),
    )
    .on('failedLoading', (language, namespace, msg) => {
      logger.error(new Error(`Error loading language ${language} ${namespace}: ${msg}`), {
        tags: {
          file: 'i18n',
          function: 'onFailedLoading',
        },
      })
    })

  i18n
    .init({
      react: {
        useSuspense: false,
      },
      returnEmptyString: false,
      keySeparator: false,
      lng: 'en-US',
      fallbackLng: 'en-US',
      interpolation: {
        escapeValue: false, // react already safes from xss
      },
    })
    .catch((err) => {
      logger.error(new Error(`Error initializing i18n ${err}`), {
        tags: {
          file: 'i18n',
          function: 'onFailedInit',
        },
      })
    })

  // add default english ns right away
  i18n.addResourceBundle('en-US', 'translations', {
    'en-US': {
      translation: enUsLocale,
    },
  })

  i18n.changeLanguage('en-US').catch((err) => {
    logger.error(new Error(`${err}`), {
      tags: {
        file: 'i18n',
        function: 'setupi18n',
      },
    })
  })
}
