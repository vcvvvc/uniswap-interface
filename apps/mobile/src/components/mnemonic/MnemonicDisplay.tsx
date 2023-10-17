import React from 'react'
import { requireNativeComponent, StyleSheet, ViewProps } from 'react-native'
import { HiddenFromScreenReaders } from 'ui/src'

interface NativeMnemonicDisplayProps {
  mnemonicId: Address
}

const NativeMnemonicDisplay = requireNativeComponent<NativeMnemonicDisplayProps>('MnemonicDisplay')

type MnemonicDisplayProps = ViewProps & NativeMnemonicDisplayProps

const styles = StyleSheet.create({
  mnemonicDisplay: {
    flex: 1,
    flexGrow: 1,
  },
})

export function MnemonicDisplay(props: MnemonicDisplayProps): JSX.Element {
  return (
    <HiddenFromScreenReaders>
      <NativeMnemonicDisplay style={styles.mnemonicDisplay} {...props} />
    </HiddenFromScreenReaders>
  )
}
