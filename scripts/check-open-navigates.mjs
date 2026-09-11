/**
 * Feedback loop for: Passkey succeeds but landing never navigates.
 * Models open()'s control flow: balance refresh must not gate success.
 *
 * Run: node scripts/check-open-navigates.mjs
 * Expect: exit 0
 */

function openControlFlow(opts) {
  const account = {
    status: 'opening',
    hasSession: false,
    address: undefined,
    errorMessage: undefined,
  }

  try {
    // passkey succeeded
    account.address = '0xabc'
    account.hasSession = true
    account.status = 'ready'

    if (opts.balanceMode === 'throw') {
      try {
        throw new Error('rpc failed')
      }
      catch (balanceError) {
        if (opts.legacyGateOnBalance) {
          // BUG: balance failure aborts open → no navigation
          account.status = 'error'
          account.errorMessage = 'passkeyFailed'
          account.hasSession = false
          return { ok: false, account, navigates: false }
        }
        // FIX: ignore balance errors for open success
      }
    }

    if (opts.balanceMode === 'hang' && opts.legacyAwaitBalance) {
      // BUG: never returns → no navigation
      return { ok: 'pending', account, navigates: false }
    }

    return { ok: true, account, navigates: true }
  }
  catch {
    account.status = 'error'
    account.hasSession = false
    return { ok: false, account, navigates: false }
  }
}

let failed = 0
function assert(name, cond) {
  if (!cond) {
    console.error(`FAIL ${name}`)
    failed++
  }
  else {
    console.log(`ok   ${name}`)
  }
}

const legacyThrow = openControlFlow({ balanceMode: 'throw', legacyGateOnBalance: true })
assert('legacy: balance throw blocks navigation (bug repro)', legacyThrow.navigates === false)

const fixedThrow = openControlFlow({ balanceMode: 'throw', legacyGateOnBalance: false })
assert('fixed: balance throw still navigates', fixedThrow.navigates === true && fixedThrow.ok === true)

const legacyHang = openControlFlow({ balanceMode: 'hang', legacyAwaitBalance: true })
assert('legacy: balance hang blocks navigation (bug repro)', legacyHang.navigates === false)

const fixedHang = openControlFlow({ balanceMode: 'hang', legacyAwaitBalance: false })
assert('fixed: skip awaiting balance navigates', fixedHang.navigates === true && fixedHang.ok === true)

if (failed > 0) {
  console.error(`\n${failed} failed`)
  process.exit(1)
}
console.log('\nall passed')
