import { format } from 'util'
import termSize from 'term-size'
import sliceAnsi from 'slice-ansi'
import stringWidth from 'string-width'

const ellipsis = '…'
const ellipsisWidth = stringWidth(ellipsis)

export default function log(...args) {
  const columns = termSize().columns - 2
  const text = format(...args)

  const rows = text.split('\n')

  if (stringWidth(rows[0]) > columns) {
    rows[0] = sliceAnsi(rows[0], 0, columns - ellipsisWidth) + ellipsis
  }

  console.log(rows.join('\n'))
}
