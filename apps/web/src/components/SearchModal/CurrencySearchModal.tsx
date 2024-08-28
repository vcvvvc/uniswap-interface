import { Currency, Token } from '@uniswap/sdk-core'
import Modal from 'components/Modal'
import { CurrencySearch } from 'components/SearchModal/CurrencySearch'
import { CurrencySearchFilters, DeprecatedCurrencySearch } from 'components/SearchModal/DeprecatedCurrencySearch'
import TokenSafety from 'components/TokenSafety'
import useLast from 'hooks/useLast'
import { memo, useCallback, useEffect, useState } from 'react'
import { useUserAddedTokens } from 'state/user/userAddedTokens'
import { FeatureFlags } from 'uniswap/src/features/gating/flags'
import { useFeatureFlag } from 'uniswap/src/features/gating/hooks'
import { CurrencyField } from 'uniswap/src/types/currency'

interface CurrencySearchModalProps {
  isOpen: boolean
  onDismiss: () => void
  selectedCurrency?: Currency | null
  onCurrencySelect: (currency: Currency) => void
  otherSelectedCurrency?: Currency | null
  showCurrencyAmount?: boolean
  currencySearchFilters?: CurrencySearchFilters
  currencyField?: CurrencyField
}

enum CurrencyModalView {
  search,
  importToken,
  tokenSafety,
}

export default memo(function CurrencySearchModal({
  isOpen,
  onDismiss,
  onCurrencySelect,
  selectedCurrency,
  otherSelectedCurrency,
  showCurrencyAmount = true,
  currencySearchFilters,
  currencyField = CurrencyField.INPUT,
}: CurrencySearchModalProps) {
  const [modalView, setModalView] = useState<CurrencyModalView>(CurrencyModalView.search)
  const lastOpen = useLast(isOpen)
  const userAddedTokens = useUserAddedTokens()
  const multichainFlagEnabled = useFeatureFlag(FeatureFlags.MultichainUX)

  useEffect(() => {
    if (isOpen && !lastOpen) {
      setModalView(CurrencyModalView.search)
    }
  }, [isOpen, lastOpen])

  const showTokenSafetySpeedbump = (token: Token) => {
    setWarningToken(token)
    setModalView(CurrencyModalView.tokenSafety)
  }

  const handleCurrencySelect = useCallback(
    (currency: Currency, hasWarning?: boolean) => {
      if (hasWarning && currency.isToken && !userAddedTokens.find((token) => token.equals(currency))) {
        showTokenSafetySpeedbump(currency)
      } else {
        onCurrencySelect(currency)
        onDismiss()
      }
    },
    [onDismiss, onCurrencySelect, userAddedTokens],
  )
  // used for token safety
  const [warningToken, setWarningToken] = useState<Token | undefined>()

  let content = null
  switch (modalView) {
    case CurrencyModalView.search:
      content = multichainFlagEnabled ? (
        <CurrencySearch currencyField={currencyField} onCurrencySelect={onCurrencySelect} onDismiss={onDismiss} />
      ) : (
        <DeprecatedCurrencySearch
          isOpen={isOpen}
          onDismiss={onDismiss}
          onCurrencySelect={handleCurrencySelect}
          selectedCurrency={selectedCurrency}
          otherSelectedCurrency={otherSelectedCurrency}
          showCurrencyAmount={showCurrencyAmount}
          filters={currencySearchFilters}
        />
      )
      break
    case CurrencyModalView.tokenSafety:
      if (warningToken) {
        content = (
          <TokenSafety
            token0={warningToken}
            onContinue={() => handleCurrencySelect(warningToken)}
            onCancel={() => setModalView(CurrencyModalView.search)}
            showCancel={true}
          />
        )
      }
      break
  }
  return (
    <Modal
      isOpen={isOpen}
      onDismiss={onDismiss}
      height="90vh"
      maxHeight={modalView === CurrencyModalView.tokenSafety ? 400 : 700}
    >
      {content}
    </Modal>
  )
})
