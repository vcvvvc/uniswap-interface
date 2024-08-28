import { createSelector, Selector } from '@reduxjs/toolkit'
import { TokenSortableField } from 'uniswap/src/data/graphql/uniswap-data-api/__generated__/types-and-hooks'
import { AccountType } from 'uniswap/src/features/accounts/types'
import { Account, ReadOnlyAccount, SignerMnemonicAccount } from 'wallet/src/features/wallet/accounts/types'
import { SwapProtectionSetting } from 'wallet/src/features/wallet/slice'
import { TokensOrderBy } from 'wallet/src/features/wallet/types'
import { WalletState } from 'wallet/src/state/walletReducer'

const DEFAULT_TOKENS_ORDER_BY = TokenSortableField.Volume

export const selectAccounts = (state: WalletState): Record<string, Account> => state.wallet.accounts

export const selectSignerMnemonicAccounts = createSelector(selectAccounts, (accounts) =>
  Object.values(accounts).filter((a): a is SignerMnemonicAccount => a.type === AccountType.SignerMnemonic),
)

export const selectSortedSignerMnemonicAccounts = createSelector(selectSignerMnemonicAccounts, (accounts) =>
  accounts.sort((a, b) => (a as SignerMnemonicAccount).derivationIndex - (b as SignerMnemonicAccount).derivationIndex),
)

export const selectSignerMnemonicAccountExists = createSelector(
  selectAccounts,
  (accounts) => Object.values(accounts).findIndex((value) => value.type === AccountType.SignerMnemonic) >= 0,
)

export const selectViewOnlyAccounts = createSelector(selectAccounts, (accounts) =>
  Object.values(accounts).filter((a): a is ReadOnlyAccount => a.type === AccountType.Readonly),
)

export const selectSortedViewOnlyAccounts = createSelector(selectViewOnlyAccounts, (accounts) =>
  accounts.sort((a, b) => a.timeImportedMs - b.timeImportedMs),
)

// Sorted signer accounts, then sorted view-only accounts
export const selectAllAccountsSorted = createSelector(
  selectSortedSignerMnemonicAccounts,
  selectSortedViewOnlyAccounts,
  (signerMnemonicAccounts, viewOnlyAccounts) => {
    return [...signerMnemonicAccounts, ...viewOnlyAccounts]
  },
)

export const selectActiveAccountAddress = (state: WalletState): string | null => state.wallet.activeAccountAddress
export const selectActiveAccount = createSelector(
  selectAccounts,
  selectActiveAccountAddress,
  (accounts, activeAccountAddress) => (activeAccountAddress ? accounts[activeAccountAddress] : null) ?? null,
)

export const selectFinishedOnboarding = (state: WalletState): boolean | undefined => state.wallet.finishedOnboarding

export const selectTokensOrderBy = (state: WalletState): TokensOrderBy =>
  state.wallet.settings.tokensOrderBy ?? DEFAULT_TOKENS_ORDER_BY

export const selectInactiveAccounts = createSelector(
  selectActiveAccountAddress,
  selectAccounts,
  (activeAddress, accounts) => Object.values(accounts).filter((account) => account.address !== activeAddress),
)

export const makeSelectAccountNotificationSetting = (): Selector<WalletState, boolean, [Address]> =>
  createSelector(
    selectAccounts,
    (_: WalletState, address: Address) => address,
    (accounts, address) => !!accounts[address]?.pushNotificationsEnabled,
  )

export const selectAnyAddressHasNotificationsEnabled = createSelector(selectAccounts, (accounts) =>
  Object.values(accounts).some((account) => account.pushNotificationsEnabled),
)

export const selectWalletHideSmallBalancesSetting = (state: WalletState): boolean =>
  state.wallet.settings.hideSmallBalances

export const selectWalletHideSpamTokensSetting = (state: WalletState): boolean => state.wallet.settings.hideSpamTokens

export const selectWalletSwapProtectionSetting = (state: WalletState): SwapProtectionSetting =>
  state.wallet.settings.swapProtection
