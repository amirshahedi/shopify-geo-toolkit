/**
 * Thin wrapper around the Shopify Admin GraphQL API.
 *
 * Uses a custom-app access token (SHOPIFY_ACCESS_TOKEN), not a public
 * OAuth app. This is the simplest path for a store owner or agency to
 * run this tool against their own store: create an admin-created custom
 * app in Settings -> Apps -> Develop apps, grant it read_products and
 * read_content scopes, and copy the token. No app review, no hosting.
 */

const API_VERSION = '2026-07';

export class ShopifyClient {
	/**
	 * @param {string} shop  Store subdomain, e.g. "my-store" (without .myshopify.com)
	 * @param {string} token Admin API access token (shpat_...)
	 */
	constructor( shop, token ) {
		if ( ! shop || ! token ) {
			throw new Error(
				'Missing SHOPIFY_STORE or SHOPIFY_ACCESS_TOKEN. Copy .env.example to .env and fill both in.'
			);
		}
		this.shop = shop.replace( '.myshopify.com', '' );
		this.token = token;
		this.endpoint = `https://${ this.shop }.myshopify.com/admin/api/${ API_VERSION }/graphql.json`;
	}

	/**
	 * @param {string} query
	 * @param {object} [variables]
	 * @returns {Promise<object>} The `data` object from the response.
	 */
	async query( query, variables = {} ) {
		const res = await fetch( this.endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Shopify-Access-Token': this.token,
			},
			body: JSON.stringify( { query, variables } ),
		} );

		if ( ! res.ok ) {
			throw new Error( `Shopify API request failed: ${ res.status } ${ res.statusText }` );
		}

		const json = await res.json();

		if ( json.errors ) {
			throw new Error( `Shopify API returned errors: ${ JSON.stringify( json.errors ) }` );
		}

		return json.data;
	}

	/**
	 * Fetch every product in the store, paging through the GraphQL cursor.
	 * Batches so large catalogs (10k+ SKUs) don't hold everything in one
	 * giant response.
	 *
	 * @returns {Promise<object[]>}
	 */
	async getAllProducts() {
		const products = [];
		let cursor = null;
		let hasNextPage = true;

		const query = `
			query GetProducts($cursor: String) {
				products(first: 100, after: $cursor, query: "status:active") {
					pageInfo { hasNextPage endCursor }
					edges {
						node {
							id
							title
							handle
							descriptionHtml
							vendor
							productType
							status
							onlineStoreUrl
							featuredImage { url }
							priceRangeV2 { minVariantPrice { amount currencyCode } }
							totalInventory
							tracksInventory
							seo { title description }
							variants(first: 1) {
								edges { node { sku barcode } }
							}
							tags
						}
					}
				}
			}
		`;

		while ( hasNextPage ) {
			const data = await this.query( query, { cursor } );
			for ( const edge of data.products.edges ) {
				products.push( edge.node );
			}
			hasNextPage = data.products.pageInfo.hasNextPage;
			cursor = data.products.pageInfo.endCursor;
		}

		return products;
	}

	/**
	 * Basic shop info for the llms.txt header.
	 *
	 * @returns {Promise<{name:string, description:string, url:string}>}
	 */
	async getShopInfo() {
		const data = await this.query( `
			query GetShop {
				shop {
					name
					description
					primaryDomain { url }
				}
			}
		` );

		return {
			name: data.shop.name,
			description: data.shop.description || '',
			url: data.shop.primaryDomain.url,
		};
	}
}
