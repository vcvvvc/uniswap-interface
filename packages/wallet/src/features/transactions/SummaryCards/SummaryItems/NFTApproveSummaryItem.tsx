import { NFTSummaryItem } from 'wallet/src/features/transactions/SummaryCards/SummaryItems/NFTSummaryItem'
import { SummaryItemProps } from 'wallet/src/features/transactions/SummaryCards/types'
import { NFTApproveTransactionInfo, TransactionDetails, TransactionType } from 'wallet/src/features/transactions/types'

export function NFTApproveSummaryItem({
  transaction,
  index,
}: SummaryItemProps & {
  transaction: TransactionDetails & { typeInfo: NFTApproveTransactionInfo }
}): JSX.Element {
  return <NFTSummaryItem index={index} transaction={transaction} transactionType={TransactionType.NFTApprove} />
}
