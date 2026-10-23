# Security notes

## Cloudflare Worker rate limit

The production Worker applies two native Cloudflare rate-limit bindings:

- 120 requests per minute for each requester IP;
- 60 requests per minute for each match session token.

This protects the current solo MVP against accidental loops and ordinary automated abuse without adding a database write for every request.

### Follow-up attention

Cloudflare's native Worker rate limit is approximate and scoped to each Cloudflare location. A sustained attacker can exceed the configured threshold during counter synchronization or by distributing traffic across locations.

Before handling sensitive accounts, paid resources, or material abuse, reassess this control. If a strict global limit is required, route each session through a Durable Object and atomically persist its counter there. Confirm the applicable Cloudflare free-tier limits and observability before enabling that architecture.

The current limits are intentionally conservative for the game UI. Revisit them after observing real usage; do not raise them solely to mask repeated `429` responses.
