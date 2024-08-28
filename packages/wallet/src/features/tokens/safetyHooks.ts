import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CurrencyId } from 'uniswap/src/types/currency'
import { dismissedWarningTokensSelector } from 'wallet/src/features/tokens/dismissedWarningTokensSelector'
import { addDismissedWarningToken } from 'wallet/src/features/tokens/tokensSlice'

export function useTokenWarningDismissed(currencyId: Maybe<CurrencyId>): {
  tokenWarningDismissed: boolean // user dismissed warning
  dismissWarningCallback: () => void // callback to dismiss warning
} {
  const dispatch = useDispatch()
  const dismissedTokens = useSelector(dismissedWarningTokensSelector)

  const tokenWarningDismissed = Boolean(currencyId && dismissedTokens && dismissedTokens[currencyId])

  const dismissWarningCallback = useCallback(() => {
    if (currencyId) {
      dispatch(addDismissedWarningToken({ currencyId }))
    }
  }, [currencyId, dispatch])

  return {
    tokenWarningDismissed,
    dismissWarningCallback,
  }
}
