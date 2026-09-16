/**
 * Audits the store's products for the fields AI answer engines and
 * Google rich results both expect from Product/Offer schema.
 */
export async function auditSchema( client, limit = 100 ) {
	const products = await client.getAllProducts();
	const sample = products.slice( 0, limit );

	const results = [];

	for ( const product of sample ) {
		const issues = checkProduct( product );
		if ( issues.length ) {
			results.push( {
				title: product.title,
				url: product.onlineStoreUrl || '',
				issues,
			} );
		}
	}

	return results;
}

function checkProduct( product ) {
	const issues = [];

	if ( ! product.featuredImage?.url ) {
		issues.push( 'Missing featured image (schema image field will be empty)' );
	}

	const description = ( product.descriptionHtml || '' ).replace( /<[^>]*>/g, '' ).trim();
	if ( ! description ) {
		issues.push( 'No description — AI engines have nothing to summarize or cite' );
	}

	const variant = product.variants?.edges?.[ 0 ]?.node;
	if ( ! variant?.sku ) {
		issues.push( 'Missing SKU on primary variant (identifier field required for many rich-result and shopping-agent integrations)' );
	}
	if ( ! variant?.barcode ) {
		issues.push( 'Missing barcode/GTIN — many AI shopping agents and Google Shopping require it' );
	}

	if ( ! product.priceRangeV2?.minVariantPrice?.amount ) {
		issues.push( 'No price set — Offer schema requires a price' );
	}

	if ( ! product.productType ) {
		issues.push( 'No product type set — weakens topical/entity context' );
	}

	if ( ! product.seo?.title || ! product.seo?.description ) {
		issues.push( 'Missing custom SEO title/description — Shopify falls back to auto-generated values, which are often thin' );
	}

	if ( product.status !== 'ACTIVE' ) {
		issues.push( `Status is ${ product.status }, not ACTIVE — may not be visible to crawlers at all` );
	}

	return issues;
}
