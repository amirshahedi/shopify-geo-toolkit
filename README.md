# Shopify GEO Toolkit

Open-source GEO/AEO toolkit for Shopify. Generates `llms.txt` and `llms-full.txt` catalog exports, audits Product/Offer schema completeness, and checks whether AI crawlers (GPTBot, PerplexityBot, ClaudeBot, Google-Extended, Amazonbot) can reach your storefront. MIT licensed, runs as a CLI against your own store, no app install or Shopify app review required.

## Why a CLI instead of a Shopify App Store listing

Every existing Shopify option in this space (LLM Rank, AEO Optimizer, several others) is a hosted, closed-source app you install from the App Store, most gated behind a paid plan for anything past basic llms.txt generation. The two open-source alternatives that exist do llms.txt generation only, nothing else.

This tool is different on purpose: it is a script you run yourself, against your own store, using a custom app access token you generate in five minutes from Shopify's own admin. No OAuth flow, no app review, no data leaving your machine except the calls you make directly to Shopify's API. Open the source, see exactly what it does.

## Setup

1. In your Shopify admin: **Settings → Apps and sales channels → Develop apps → Create an app**.
2. Configure Admin API scopes: grant `read_products` (and `read_content` if you want to extend this later to pages/blogs).
3. Install the app on your store, then reveal and copy the Admin API access token.
4. Clone this repo, then:
   ```bash
   npm install
   cp .env.example .env
   # edit .env with your store name and access token
   ```

## Usage

```bash
npm run generate        # writes ./geo-exports/llms.txt and llms-full.txt
npm run audit-schema    # lists products missing image, description, SKU, GTIN, price, or SEO fields
npm run audit-crawlers  # checks robots.txt against known AI bot user-agents
```

Or directly:
```bash
node bin/cli.js generate --out ./geo-exports
node bin/cli.js audit-schema --limit 500
node bin/cli.js audit-crawlers
```

## Publishing the generated files

Shopify doesn't let a script write directly to your storefront's root, so `llms.txt` needs to be served another way. Two options:

- Add a **page** in Shopify admin with the handle `llms.txt`, and a redirect from `/llms.txt` to that page (Settings → Apps and sales channels → ... → URL Redirects), or
- Serve it from a `robots.txt.liquid`-style theme asset if your theme supports custom static routes.

A theme-extension approach that serves this automatically is on the roadmap below.

## Roadmap

- [ ] Shopify theme app extension to auto-serve `/llms.txt` without a manual redirect
- [ ] Scheduled regeneration via GitHub Actions cron, committing the output to a repo Pages site
- [ ] Multi-store batch mode (generate across every store in a portfolio in one run)
- [ ] Collection-level schema audit in addition to product-level

## Contributing

Issues and PRs welcome. Built against real stores, not a demo catalog — feedback from anyone running this against their own shop is the most useful kind.

## License

MIT — see [LICENSE](LICENSE).
