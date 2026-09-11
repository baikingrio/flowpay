# Signing Session is ephemeral memory with a 10-minute cap

A Signing Session is a Mera in-memory key plus Flowpay policy: it is never written to storage. It ends on whichever comes first — 10 minutes of wall clock, page reload or tab close, or an explicit lock. P0 does not add spend limits or call allowlists. After it ends, the next Payment or Swap requires Continue (another Passkey ceremony); in-progress form fields are kept.

**Status**: accepted
