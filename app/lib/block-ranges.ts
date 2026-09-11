/**
 * Split a block range into chunks of at most maxSpan blocks each.
 * Used to work around RPC providers that limit eth_getLogs range.
 *
 * @param from - Starting block number (inclusive)
 * @param to - Ending block number (inclusive)
 * @param maxSpan - Maximum span per chunk (default 100)
 * @returns Array of [from, to] pairs covering the full range
 *
 * @example
 * blockRanges(100n, 250n, 100)
 * // => [[100n, 199n], [200n, 250n]]
 */
export function blockRanges(
  from: bigint,
  to: bigint,
  maxSpan = 100,
): Array<[bigint, bigint]> {
  if (from > to) {
    return []
  }

  const ranges: Array<[bigint, bigint]> = []
  let current = from

  while (current <= to) {
    const end = current + BigInt(maxSpan - 1)
    const chunkEnd = end > to ? to : end
    ranges.push([current, chunkEnd])
    current = chunkEnd + 1n
  }

  return ranges
}
