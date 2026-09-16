import fs from 'node:fs';
import path from 'node:path';

/**
 * Builds llms.txt and llms-full.txt from the store's active product
 * catalog and writes them to ./geo-exports/.
 */
export async function generateLlmsFiles( client, outDir = './geo-exports' ) {
	const shop = await client.getShopInfo();
	const products = await client.getAllProducts();

	fs.mkdirSync( outDir, { recursive: true } );

	const llms = buildLlmsTxt( shop, products );
	const llmsFull = buildLlmsFullTxt( shop, products );

	fs.writeFileSync( path.join( outDir, 'llms.txt' ), llms );
	fs.writeFileSync( path.join( outDir, 'llms-full.txt' ), llmsFull );

	return {
		llmsPath: path.join( outDir, 'llms.txt' ),
		llmsFullPath: path.join( outDir, 'llms-full.txt' ),
		productCount: products.length,
	};
}

function stripHtml( html ) {
	return ( html || '' ).replace( /<[^>]*>/g, ' ' ).replace( /\s+/g, ' ' ).trim();
}

function buildLlmsTxt( shop, products ) {
	const lines = [];
	lines.push( `# ${ shop.name }` );
	lines.push( '' );
	if ( shop.description ) {
		lines.push( `> ${ shop.description }` );
		lines.push( '' );
	}
	lines.push(
		`A Shopify store catalog exported for AI/LLM discovery. ${ products.length } active products as of ${ new Date().toISOString().slice( 0, 10 ) }.`
	);
	lines.push( '' );
	lines.push( '## Store' );
	lines.push( `- Homepage: ${ shop.url }` );
	lines.push( '- Full catalog (Markdown, one block per product): /geo-exports/llms-full.txt' );
	lines.push( '' );

	const productTypes = [ ...new Set( products.map( ( p ) => p.productType ).filter( Boolean ) ) ];
	if ( productTypes.length ) {
		lines.push( '## Product types' );
		for ( const type of productTypes ) {
			lines.push( `- ${ type }` );
		}
		lines.push( '' );
	}

	lines.push( '## Products' );
	for ( const product of products.slice( 0, 50 ) ) {
		const summary = stripHtml( product.seo?.description || product.descriptionHtml ).slice( 0, 160 );
		lines.push( `- [${ product.title }](${ product.onlineStoreUrl || '' }) — ${ summary }` );
	}

	return lines.join( '\n' ) + '\n';
}

function buildLlmsFullTxt( shop, products ) {
	const lines = [];
	lines.push( `# ${ shop.name } — Full Product Catalog` );
	lines.push( '' );
	lines.push( `Generated ${ new Date().toISOString() }. ${ products.length } products.` );
	lines.push( '' );

	for ( const product of products ) {
		const variant = product.variants?.edges?.[ 0 ]?.node;
		lines.push( `## ${ product.title }` );
		lines.push( '' );
		lines.push( `- URL: ${ product.onlineStoreUrl || '' }` );
		lines.push( `- SKU: ${ variant?.sku || 'n/a' }` );
		lines.push( `- Vendor: ${ product.vendor || 'n/a' }` );
		lines.push( `- Type: ${ product.productType || 'n/a' }` );
		lines.push(
			`- Price: ${ product.priceRangeV2?.minVariantPrice?.amount || '' } ${ product.priceRangeV2?.minVariantPrice?.currencyCode || '' }`
		);
		lines.push( `- Availability: ${ product.totalInventory > 0 ? 'In stock' : 'Out of stock' }` );
		if ( product.tags?.length ) {
			lines.push( `- Tags: ${ product.tags.join( ', ' ) }` );
		}

		const description = stripHtml( product.descriptionHtml );
		if ( description ) {
			lines.push( '' );
			lines.push( description );
		}

		lines.push( '' );
		lines.push( '---' );
		lines.push( '' );
	}

	return lines.join( '\n' );
}
