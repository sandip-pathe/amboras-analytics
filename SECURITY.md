# Security Policy

Amboras Analytics is currently a proof-of-work project and hosted-demo candidate. Do not use it for real merchant data without production hardening.

## Supported Versions

Security fixes are tracked against the `main` branch.

## Reporting A Vulnerability

Please do not open a public issue for sensitive vulnerabilities.

Report privately by emailing the maintainer or opening a GitHub security advisory if available for the repository.

Include:

- affected component
- reproduction steps
- expected impact
- suggested fix, if known

## Current Security Limitations

- Demo auth allows any store ID to mint a token.
- SSE accepts JWTs in the query string because browser `EventSource` cannot send custom headers.
- Store isolation is enforced in application code rather than PostgreSQL Row Level Security.
- Event ingestion does not yet use scoped write-only ingest keys.
- No rate limiting is currently applied to event ingestion.
- No privacy or retention policy exists for real merchant data.

## Before Production Use

- Replace demo token minting with real user auth.
- Add scoped, revocable ingest keys.
- Add PostgreSQL Row Level Security.
- Add short-lived stream tokens for SSE.
- Add API rate limits and request size limits.
- Add audit logging for sensitive actions.
- Add Redis Pub/Sub or another broker for multi-instance SSE.
