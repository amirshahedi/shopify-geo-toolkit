/**
 * Checks whether known AI-search crawlers are allowed to fetch the
 * store, by parsing the storefront's live robots.txt.
 *
 * Shopify serves a default robots.txt for every store, but merchants
 * can edit it via a robots.txt.liquid template override, so this is
 * worth checking rather than assuming.
 */

const KNOWN_BOTS = {
	GPTBot: 'ChatGPT / OpenAI',
	'ChatGPT-User': 'ChatGPT (browsing plugin)',
	'OAI-SearchBot': 'ChatGPT Search',
	PerplexityBot: 'Perplexity',
	ClaudeBot: 'Claude / Anthropic',
	'anthropic-ai': 'Claude (legacy tag)',
	'Google-Extended': 'Google AI Overviews / Gemini training',
	Bingbot: 'Bing / Copilot',
	Amazonbot: 'Amazon (Rufus / shopping agents)',
};

export async function auditCrawlers( shopUrl ) {
	const robotsUrl = new URL( '/robots.txt', shopUrl ).toString();

	let body;
	try {
		const res = await fetch( robotsUrl );
		if ( ! res.ok ) {
			return { fetched: false, bots: {} };
		}
		body = await res.text();
	} catch {
		return { fetched: false, bots: {} };
	}

	const blocks = parseRobots( body );
	const bots = {};

	for ( const [ agent, engine ] of Object.entries( KNOWN_BOTS ) ) {
		bots[ agent ] = { engine, allowed: isAllowed( agent, blocks ) };
	}

	return { fetched: true, bots };
}

function parseRobots( body ) {
	const blocks = {};
	let currentAgents = [];
	let ruleSeenForCurrentBlock = false;

	for ( const rawLine of body.split( /\r?\n/ ) ) {
		const line = rawLine.trim();
		if ( ! line || line.startsWith( '#' ) ) {
			continue;
		}

		const agentMatch = line.match( /^User-agent:\s*(.+)$/i );
		if ( agentMatch ) {
			if ( ruleSeenForCurrentBlock ) {
				currentAgents = [];
				ruleSeenForCurrentBlock = false;
			}
			const agent = agentMatch[ 1 ].trim();
			currentAgents.push( agent );
			if ( ! blocks[ agent ] ) {
				blocks[ agent ] = [];
			}
			continue;
		}

		const disallowMatch = line.match( /^Disallow:\s*(.*)$/i );
		if ( disallowMatch && currentAgents.length ) {
			const rule = disallowMatch[ 1 ].trim();
			for ( const agent of currentAgents ) {
				blocks[ agent ].push( rule );
			}
			ruleSeenForCurrentBlock = true;
		}
	}

	return blocks;
}

function isAllowed( agent, blocks ) {
	if ( blocks[ agent ]?.includes( '/' ) ) {
		return false;
	}
	if ( blocks[ '*' ]?.includes( '/' ) && ! blocks[ agent ] ) {
		return false;
	}
	return true;
}
