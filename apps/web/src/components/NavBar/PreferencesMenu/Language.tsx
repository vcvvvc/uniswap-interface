import { LanguageMenuItems } from 'components/AccountDrawer/LanguageMenu'
import { PreferencesHeader } from 'components/NavBar/PreferencesMenu/Header'
import { SettingsColumn } from 'components/NavBar/PreferencesMenu/shared'
import { Trans } from 'uniswap/src/i18n'

export function LanguageSettings({ onExitMenu }: { onExitMenu: () => void }) {
  return (
    <>
      <PreferencesHeader onExitMenu={onExitMenu}>
        <Trans i18nKey="common.language" />
      </PreferencesHeader>
      <SettingsColumn>
        <LanguageMenuItems />
      </SettingsColumn>
    </>
  )
}
