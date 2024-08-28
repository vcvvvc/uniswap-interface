import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { openModal } from 'src/features/modals/modalSlice'
import { selectModalState } from 'src/features/modals/selectModalState'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { logger } from 'utilities/src/logger/logger'
import { Keyring } from 'wallet/src/features/wallet/Keyring/Keyring'
import { useNativeAccountExists } from 'wallet/src/features/wallet/hooks'

export function useWalletRestore(params?: { openModalImmediately?: boolean }): {
  walletNeedsRestore: undefined | boolean
  openWalletRestoreModal: () => void
  isModalOpen: boolean
} {
  const dispatch = useDispatch()
  const openModalImmediately = params?.openModalImmediately
  // Means that no private key found for mnemonic wallets
  const [walletNeedsRestore, setWalletNeedsRestore] = useState<boolean>(false)
  const hasImportedSeedPhrase = useNativeAccountExists()

  const openWalletRestoreModal = useCallback((): void => {
    dispatch(openModal({ name: ModalName.RestoreWallet }))
  }, [dispatch])

  useEffect(() => {
    if (!hasImportedSeedPhrase) {
      return
    }

    const openRestoreWalletModalIfNeeded = async (): Promise<void> => {
      const addresses = await Keyring.getAddressesForStoredPrivateKeys()
      setWalletNeedsRestore(hasImportedSeedPhrase && !addresses.length)
    }
    openRestoreWalletModalIfNeeded().catch((error) =>
      logger.error(error, { tags: { file: 'wallet/hooks', function: 'useWalletRestore' } }),
    )
  }, [dispatch, hasImportedSeedPhrase])

  useEffect(() => {
    if (openModalImmediately && walletNeedsRestore) {
      openWalletRestoreModal()
    }
  }, [openModalImmediately, openWalletRestoreModal, walletNeedsRestore])

  const isModalOpen = useSelector(selectModalState(ModalName.RestoreWallet)).isOpen

  return { walletNeedsRestore, openWalletRestoreModal, isModalOpen }
}
