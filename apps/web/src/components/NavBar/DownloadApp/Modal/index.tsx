import { InterfaceModalName } from '@uniswap/analytics-events'
import Modal from 'components/Modal'
import { GetStarted } from 'components/NavBar/DownloadApp/Modal/GetStarted'
import { GetTheApp } from 'components/NavBar/DownloadApp/Modal/GetTheApp'
import styled, { css } from 'lib/styled-components'
import { useCallback, useState } from 'react'
import { ArrowLeft, X } from 'react-feather'
import { useCloseModal, useModalIsOpen } from 'state/application/hooks'
import { ApplicationModal } from 'state/application/reducer'
import { ClickableStyle } from 'theme/components'
import { AnimateTransition, Flex } from 'ui/src'
import { iconSizes } from 'ui/src/theme'
import Trace from 'uniswap/src/features/telemetry/Trace'

const StyledModal = styled(Modal)`
  display: block;
`
const Wrapper = styled.div`
  position: relative;
  padding: 24px;
  width: 100%;
  user-select: none;
`
const HeaderActionIcon = css`
  margin: 4px;
  color: ${({ theme }) => theme.neutral1};
  ${ClickableStyle};
`
const CloseButton = styled(X)`
  ${HeaderActionIcon}
`
const BackButton = styled(ArrowLeft)`
  ${HeaderActionIcon}
`

enum Page {
  GetStarted = 'GetStarted',
  GetApp = 'GetApp',
}

export function GetTheAppModal() {
  const [page, setPage] = useState<Page>(Page.GetStarted)
  const isOpen = useModalIsOpen(ApplicationModal.GET_THE_APP)
  const closeModal = useCloseModal()
  const close = useCallback(() => {
    closeModal()
    setTimeout(() => setPage(Page.GetStarted), 500)
  }, [closeModal, setPage])
  const showBackButton = page !== Page.GetStarted

  return (
    <Trace modal={InterfaceModalName.GETTING_STARTED_MODAL}>
      <StyledModal isOpen={isOpen} maxWidth={620} slideIn onDismiss={closeModal}>
        <Wrapper data-testid="download-uniswap-modal">
          <Flex row justifyContent={showBackButton ? 'space-between' : 'flex-end'}>
            {showBackButton && <BackButton onClick={() => setPage(Page.GetStarted)} size={iconSizes.icon24} />}
            <CloseButton onClick={close} size={iconSizes.icon24} data-testid="get-the-app-close-button" />
          </Flex>
          <AnimateTransition
            currentIndex={page === Page.GetStarted ? 0 : 1}
            animationType={page === Page.GetStarted ? 'forward' : 'backward'}
          >
            <GetStarted toAppDownload={() => setPage(Page.GetApp)} />
            <GetTheApp />
          </AnimateTransition>
        </Wrapper>
      </StyledModal>
    </Trace>
  )
}
