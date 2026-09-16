#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { ShopifyClient } from '../src/shopify-client.js';
import { generateLlmsFiles } from '../src/llms-generator.js';
import { auditSchema } from '../src/schema-auditor.js';
import { auditCrawlers } from '../src/crawler-audit.js';

const program = new Command();

program
	.name( 'shopify-geo' )
	.description( 'Open-source GEO/AEO toolkit for Shopify' )
	.version( '0.1.0' );

program
	.command( 'generate' )
	.description( 'Generate llms.txt and llms-full.txt from the live product catalog' )
	.option( '-o, --out <dir>', 'output directory', './geo-exports' )
	.action( async ( opts ) => {
		const client = getClient();
		console.log( 'Fetching products from Shopify...' );
		const result = await generateLlmsFiles( client, opts.out );
		console.log(
			`Generated ${ result.llmsPath } and ${ result.llmsFullPath } — ${ result.productCount } products.`
		);
	} );

program
	.command( 'audit-schema' )
	.description( 'Audit products for Schema.org/Offer completeness gaps' )
	.option( '-l, --limit <number>', 'max products to check', '100' )
	.action( async ( opts ) => {
		const client = getClient();
		const issues = await auditSchema( client, parseInt( opts.limit, 10 ) );

		if ( ! issues.length ) {
			console.log( 'No schema gaps found.' );
			return;
		}

		for ( const row of issues ) {
			console.log( `\n${ row.title } (${ row.url })` );
			for ( const issue of row.issues ) {
				console.log( `  - ${ issue }` );
			}
		}
		console.log( `\n${ issues.length } products with gaps.` );
	} );

program
	.command( 'audit-crawlers' )
	.description( 'Check whether known AI crawlers are allowed by robots.txt' )
	.action( async () => {
		const client = getClient();
		const shop = await client.getShopInfo();
		const report = await auditCrawlers( shop.url );

		if ( ! report.fetched ) {
			console.error( 'Could not fetch robots.txt.' );
			process.exitCode = 1;
			return;
		}

		for ( const [ agent, data ] of Object.entries( report.bots ) ) {
			const status = data.allowed ? 'allowed' : 'BLOCKED';
			console.log( `${ agent.padEnd( 16 ) } ${ data.engine.padEnd( 32 ) } ${ status }` );
		}
	} );

program.parse();

function getClient() {
	return new ShopifyClient( process.env.SHOPIFY_STORE, process.env.SHOPIFY_ACCESS_TOKEN );
}
