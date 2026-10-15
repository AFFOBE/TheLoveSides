# FILTER ANALYSIS REPORT - TheLoveSides Storefront
================================================

**Investigation Location:** C:\Users\Dell\Desktop\thelovesides\TheLoveSides\apps\storefront
**Date:** 2026-10-13
**Status:** READ-ONLY (no files modified)

## 1. SHOP ALL PAGE & FILTER DROPDOWN COMPONENTS

### 1.1 "Shop All" Page/Component
- **Primary Page Component:** pps/storefront/src/pages/ProductsPage.jsx (lines 1-550)  
  - The page renders "Shop All Products" heading (line 356) with breadcrumb showing "Shop All" (line 353)
  - Uses React Router with useSearchParams (line 39) to read/write URL params

### 1.2 Dropdown Controls in ProductsPage.jsx

The ProductsPage renders filter controls in FilterSidebarContent() (lines 120-340) and also has sort dropdown in the header bar (lines 405-416).

**Sort Dropdown (line 405-416):**
- UI Element: <select id="sort"> 
- Options: newest (default), price_asc, price_desc, bestseller_auto
- State/URL param: sort (read from line 47, written via updateParam('sort', ...) line 408)

**Filter Dropdowns (Accordion-based, not traditional select dropdowns - button-based filters):**

1. **Availability (In Stock Only) - Checkbox** (lines 123-140)
- Type: Checkbox control (not dropdown)
- State: inStock from URL param inStock (line 50, parsed as inStock === 'true')
- Writes to: inStock param (line 130 sets 'true' or deletes)

2. **Price Range - Input Fields** (lines 143-172)
- Type: Two number inputs (Min/Max)
- State: minPrice (line 48), maxPrice (line 49), local priceInput (line 52)
- Writes to: minPrice and maxPrice via pplyPriceFilter() (line 84-86)

3. **Categories - Button List** (lines 175-205)
- Type: Accordion with button list (no select dropdown)
- Data source: useCategories() hook (line 91) fetches from /catalog/categories (confirmed from hook implementation)
- Options come from: API GET /catalog/categories (see useCategories.js - fetched from api)
- State/URL param: category (line 43), subcategory (line 44) - also clears subcategory when category changes (line 194)
- Writes to: category and optionally resets subcategory

4. **Subcategories - Button List** (lines 208-245)
- Type: Accordion with button list
- Data source: useSubCategories() hook (line 92) - /catalog/subcategories
- Filtered by selected category (lines 225-231): compares sub.categoryIds against cat._id
- State/URL param: subcategory (line 44)
- Writes to: subcategory

5. **Collections - Button List** (lines 248-278)
- Type: Accordion with button list  
- Data source: useCollections() hook (line 88) fetches from /catalog/collections (see useCollections.js:18)
- Options come from: API GET /catalog/collections (returns active collections)
- State/URL param: collection (line 41)
- Writes to: collection via updateParam('collection', collection.slug) (line 267)

6. **Rooms - Button List** (lines 281-311)
- Type: Accordion with button list
- Data source: useRooms() hook (line 89) fetches from /catalog/rooms
- State/URL param: oom (line 42)  
- Writes to: oom via updateParam('room', room.slug) (line 300)

7. **Colors - Button Grid (Swatches)** (lines 314-338)
- Type: Color swatch buttons (no dropdown)
- Data source: useColors() hook (line 90) fetches from /catalog/products/colors (see useColors.js:18)
- Options structure: returns array of objects like {id, label, hex} (see API controller getAvailableColors in product.ts)
- State/URL param: color (line 45) - uses color.label as the value (line 324)
- Writes to: color (stores the label value, e.g., "Blue", "Charcoal")
- When clicking same color again, toggles off (deletes param)

### 1.3 Summary of all filter controls
All filter controls write to URL search params via updateParams()/updateParam() which uses React Router's setSearchParams. The params map to API query as constructed in ProductsPage:
`js
const query = {};
if (selectedCollection) query.collection = selectedCollection;  // line 95
if (selectedRoom) query.room = selectedRoom;                    // line 96
if (selectedCategory) query.category = selectedCategory;         // line 97
if (selectedSubcategory) query.subcategory = selectedSubcategory; // line 98
if (selectedColor) query.color = selectedColor;                  // line 99
if (searchQuery) query.q = searchQuery;                          // line 100
if (selectedSort) query.sort = selectedSort;                     // line 101
if (minPrice) query.minPrice = minPrice;                         // line 102
if (maxPrice) query.maxPrice = maxPrice;                         // line 103
if (inStock) query.inStock = 'true';                             // line 104
`

This query object is passed to useProducts(query) which sends it as API params to GET /catalog/products.

## 2. UI -> STATE/URL -> API REQUEST PARAMS MAPPING

| Filter Control | UI Element | URL Param | Value Type (from ProductsPage) | Sent to API as | Notes |
|---|---|---|---|---|---|
| Collection | Button in Collections Accordion | collection | collection.slug (string) | collection | Frontend passes slug to API (line 95 in ProductsPage) |
| Room | Button in Rooms Accordion | oom | room.slug (string) | oom | Frontend passes slug (line 96) |
| Category | Button in Categories Accordion | category | category.slug (string) | category | Frontend passes slug (line 97) |
| Subcategory | Button in Subcategories Accordion | subcategory | subcategory.slug (string) | subcategory | Frontend passes slug (line 98) |
| Color | Color swatch button | color | color.label (string, e.g. "Blue") | color | Frontend passes label value (line 99) - see color selection logic line 324 |
| Search | Search box | q | searchQuery string | q | (line 100) |
| Sort | Sort select dropdown | sort | selectedSort string (default 'newest') | sort | Options: newest, price_asc, price_desc, bestseller_auto (line 411-415) |
| Price Min | Number input | minPrice | string | minPrice | (line 102) |
| Price Max | Number input | maxPrice | string | maxPrice | (line 103) |
| In Stock | Checkbox | inStock | 'true' when checked | inStock | Only sent if true (line 104) |

**API Request:** useProducts does pi.get('/catalog/products', { params: { limit: 100, ...query } }) (useProducts.js:18)

So products do contain color/room/collection data in the expected schema format.

## 5. WHERE "COLLECTIONS" DROPDOWN OPTIONS COME FROM & "FESTIVE" MAPPING

### 5.1 Source of Collections dropdown options
As analyzed in section 1:
- Frontend hook: `useCollections()` in `apps/storefront/src/hooks/useCollections.js` 
- API call: `GET /catalog/collections` (line 18 in hook)
- Backend: `getActiveCollections()` in `apps/api/src/controllers/public/collection.ts` (line 6-34)
- Returns: All Collection documents where `isActive: true`, `deletedAt: null`, and date range valid (current date between startDate/endDate or nulls)
- Sorted by `sortOrder: 1`

The dropdown options in ProductsPage (line 264-275) render:
```jsx
{collections.map(collection => (
  <button key={collection._id} onClick={() => updateParam('collection', collection.slug)}>
    {collection.name}
  </button>
))}
```
So options come from API. Displayed as `collection.name`, value sent to URL/API is `collection.slug`.

### 5.2 What does "festive" map to?
- Searched entire codebase for "festive" (case-insensitive in content) - **no matches found** in source files (frontend, backend controllers/models, seed scripts, data files)
- Seeded collections are: luxe-living, summer-sheer, warm-wood, kitchen-charm (4 collections total)
- No collection with slug/name containing "festive"

### 5.3 Does frontend send `collection=festive` or something else?
From current codebase state - **NO**. The Collections dropdown only shows collections returned by the API (from DB/seeded data). Since no "festive" collection exists in codebase or seeds, it would not appear as an option. If someone manually adds `?collection=festive` to URL, the frontend will:
- Set `selectedCollection = 'festive'` (line 41 in ProductsPage)
- Send `query.collection = 'festive'` to API (line 95)
- Display "Collection: festive" as active filter chip (line 425-428) because it falls back to showing the slug when not found in collections array: `{collections?.find(c => c.slug === selectedCollection)?.name || selectedCollection}`

### 5.4 Does backend filter on it?
As analyzed in section 3.2: Backend's `listProducts` does (product.ts line ~82-92):
```ts
if (collection) {
  const collStr = collection as string;
  if (mongoose.Types.ObjectId.isValid(collStr)) {
    query.collectionIds = new mongoose.Types.ObjectId(collStr);
  } else {
    const collDoc = await mongoose.model('Collection').findOne({ slug: collStr }).lean();
    if (collDoc) query.collectionIds = (collDoc as any)._id;
  }
}
```
**If `festive` is passed as slug:** It looks up Collection where slug='festive'. Since no such document exists (based on seed data), `collDoc` is null - so it does **NOT** set `query.collectionIds`. The rest of the query (status, other filters) remains unchanged. That means **no collection filter is applied**. Products are returned as if no collection filter was specified.

**So the answer:** Frontend will only send `collection=festive` if such option exists or if URL is manipulated. Currently no "festive" collection exists in seeded data or code. If sent, backend does NOT filter on it because it cannot find a Collection with slug 'festive'.

## 6. FRONTEND CLIENT-SIDE FILTERING LOGIC

**File:** `apps/storefront/src/pages/ProductsPage.jsx`
**Products source:** `const { products, loading: productsLoading } = useProducts(query);` (line 106)

Looking at how `products` is computed:
- `useProducts` hook fetches from API: `GET /catalog/products` with params including all filters (line 18 in useProducts.js)
- The hook transforms API response to frontend format (lines 21-54 in useProducts.js)
- For sorting: after transformation, it does client-side sorting for `price_asc` and `price_desc` (lines 43-49 in useProducts.js). Also note: API also handles sorting server-side in listProducts (lines 222-241 in product.ts) - there may be duplication.
- **No other client-side filtering is done in useProducts hook.**

In ProductsPage.jsx itself:
- After getting `products` from hook, it just does pagination: `const visibleProducts = products.slice(0, visibleCount);` (line 108)
- No `.filter()` calls on `products` array in ProductsPage
- All filtering logic appears to be server-side via API call with query params

**Conclusion:** There is **NO client-side re-filtering** after the fetch in ProductsPage.jsx. The filtering is done server-side by the API based on the query params sent. The only client-side logic is sorting for price (also partially done server-side) and pagination/slicing for display.

**Fields filtered on client-side?** None for filtering criteria (collection/room/category/color/price etc.). Only presentation logic.

## 7. POTENTIAL MISMATCHES IDENTIFIED

Based on codebase analysis:

### (a) Dropdown options not displaying
**Possible causes:**
1. Collections/Rooms/Categories/Colors hooks failing to fetch (API down, wrong base URL)
2. API returning empty arrays - e.g. collections where none match date range criteria? getActiveCollections checks date range (lines 9-21 in collection.ts). If all collections have endDate in past or startDate in future, they won't be returned.
3. Colors API returns empty if no products have Color attributes - but seeded products do have Color attributes.

**Current state from seed data:** Collections should return 4 items (luxe-living, summer-sheer, warm-wood, kitchen-charm). Rooms 4 items. Categories 4 items. Colors will be aggregated from all published products' Color attributes.

### (b) Festive collection shows no products
**Root cause identified:**
1. **No "festive" collection exists** in DB/seed data. The Collections API returns only active collections from Collection model; none are named/sluggified as "festive".
2. **Frontend sends wrong param or non-existent slug:** If festive option is shown, it sends `collection=festive`. 
3. **Backend doesn't filter when slug not found:** As shown in product.ts line ~90-92, if collection slug is not found, it does NOT add `collectionIds` filter. So API returns all products (or products matching other filters) - not zero results due to filtering, but effectively unfiltered. However, if the UI is expecting "festive" to map to something specific, products won't match the intended set.
4. **Also check:** Is "festive" meant to map to a tag like `festive` in product.tags? The backend does NOT look up by tag when filtering by collection param. Collection filtering is strictly by collectionIds (references to Collection documents). To filter by festive as a tag, you'd need separate param or different handling.

**Concrete mismatch:** Dropdown option value might be `festive` but there's no Collection document with slug 'festive' AND/OR products don't have that collection assigned. Backend collection filter requires a valid Collection reference.

### (c) Color filter issues
**Potential mismatches:**

1. **Value format consistency:**
- Frontend sends `color` param as `color.label` from colors API (e.g., "Blue") - see ProductsPage line 324
- Colors API (getAvailableColors in product.ts) normalizes: extracts label (e.g., "Blue" from "BLUE (#0122c6)") and returns `{label, hex, id}` (lines ~390-450 in product.ts)
- Backend color filter in listProducts does: takes the color param, escapes it, builds regex `^${colorStr}(?:\s*\(.*\))?$` against `attributes.values` where name is color (case-insensitive). So it matches if stored value starts with the label.
- **Seed data:** attributes store values as `colorVal()` which produces `"${c} (${PALETTE[c]})"` - e.g., "Blue (#2E4570)". So "Blue" sent from frontend will match "Blue (#2E4570)" ?

2. **Field name mismatch check:** Frontend sends param as `color` (singular). Backend filters on `product.attributes[].values` where attribute name is "Color"/"color". Correct.
3. **Case sensitivity:** Backend uses case-insensitive regex for both attribute name and value comparison. Frontend sends label as-is from API (e.g., "Blue" with capital B). Should be fine.

**No obvious mismatch in color handling based on code.** The logic is: frontend uses the label from the aggregated colors list; backend matches that label against attribute values (which may include hex). This matches.

### (d) Room filter issues
**Potential mismatches:**

1. **Param name:** Frontend sends `room` (slug) - correct. Backend expects `room` query param and resolves to `roomIds` - correct.
2. **Data type:** Products store rooms as `roomIds` (ObjectId refs). Backend looks up Room by slug and filters `roomIds = roomDoc._id`. Correct.
3. **Seed data:** Products have roomIds assigned. Rooms collection has 4 rooms. Should work.

**No obvious mismatch.**

### Additional potential mismatch: sort param "bestseller_auto"
- Frontend sort options include `bestseller_auto` (line 414 in ProductsPage: `<option value="bestseller_auto">Best Sellers</option>`)
- Backend handles `sort === 'bestseller_auto'` by setting `sortOptions = { salesCount: -1, createdAt: -1 }` (line 230-239 in product.ts). Also handles `req.query.bestseller_auto === 'true'`. Correct.

### Potential issue: "collection" vs other naming
- The codebase consistently uses `collection` (singular) as param name and `collectionIds` in schema. Correct.

## CONCRETE ROOT-CAUSE HYPOTHESES

### (a) Dropdown options not displaying
**Root causes:**
1. **API returns no active collections/rooms/categories** if data hasn't been seeded properly or if date filters exclude all collections. getActiveCollections() filters by date validity - if all seeded collections have no dates set (null), they should be included. Seeds show collections created with just basic fields (no startDate/endDate specified in seed-store.ts lines 64-75), so they default to null - should be included.
2. **Empty colors array** if no published products exist with Color attributes, or if products have attributes with different casing than "Color" (seed uses "Color" capital C; backend checks case-insensitively). 
3. **Hook/API error not surfaced** - components show loading states then render empty lists if data is empty.

**Most likely:** Data not seeded in the running environment, or API endpoint returns error. Need to check actual DB/API state.

### (b) Festive collection shows no products
**Root causes:**
1. **No festive collection exists** - if UI has a hardcoded "Festive" option not coming from API, but codebase shows Collections dropdown is populated from API. The ProductsPage reads from API (useCollections). So unless API returns a festive collection, it won't show. If somehow festive is shown, slug doesn't exist ? backend lookup fails ? no collection filter applied ? returns all products (not filtered) or could behave unexpectedly. But more likely "no products match" perception if expecting filtered results.
2. **Misalignment:** Maybe "festive" is intended to be a tag/collection name that doesn't exist in current data model. Frontend might be sending `collection=festive` but products aren't tagged to any festive collection. Also if backend can't resolve the slug, the query won't filter by collectionIds - so it returns all published products that match other filters. That could give "wrong" results (too many) rather than "no products". Or if combined with other logic, zero.

**Key issue:** Backend silently ignores unknown collection slugs (doesn't add filter). This is potentially confusing behavior.

### (c) Color filter not working
**Root causes to check:**
1. **Label format mismatch** - if frontend color.label is different from what's matched. e.g., API normalizes to Title case ("Blue") but stored differently. Based on seed: stored as "Blue (#2E4570)" via colorVal; API extracts label as "Blue" (title cased). Backend regex matches "Blue" against "Blue (#2E4570)" - correct.
2. **Attribute name casing** - seed writes `name: 'Color'` (capital C). Backend does `/^color$/i` so case-insensitive - correct.
3. **Products not populated with variants properly?** No - color filtering is on Product.attributes, not variants. Correct.

**No clear code-level mismatch.**

### (d) Room filter not working
**Root causes:**
1. Similar to collection - unknown slug ignored silently. If room slug doesn't exist, backend doesn't filter ? returns all products.
2. Room data might not be properly seeded/linked to products.

**No clear code-level mismatch in param names/logic.**

## SUMMARY OF EXACT FINDINGS

**Shop All Page:** `apps/storefront/src/pages/ProductsPage.jsx:353,356` - renders "Shop All" / "Shop All Products"
**Filter Controls Location:** ProductsPage.jsx lines 120-340 (sidebar) + 405-416 (sort)
**Collections Source:** `useCollections()` ? API `GET /catalog/collections` ? `getActiveCollections()` in `apps/api/src/controllers/public/collection.ts`
**Rooms Source:** `useRooms()` ? `/catalog/rooms`  
**Colors Source:** `useColors()` ? `/catalog/products/colors` (aggregates from Product.attributes)
**API Endpoint:** `GET /catalog/products` (listProducts in `apps/api/src/controllers/public/product.ts`)

**Param Mapping (Frontend ? API):** collection/room/category/subcategory use slug; color uses label; sort/minPrice/maxPrice/q/inStock as-is.

**Backend Parsing:** collection/room/category/subcategory resolved by slug?ObjectId via lookups; color filtered via attributes $elemMatch with regex; price/inStock via variant aggregation. **NO handling for 'festive'/'fest' param.**

**Product Schema:** Has roomIds[], collectionIds[], categoryIds[], subCategoryIds[], tags[], attributes[] - no standalone colors/rooms/collections string arrays. (see `apps/api/src/models/Product.ts`)

**Seed Data:** Collections = luxe-living, summer-sheer, warm-wood, kitchen-charm (no festive). Products have Color attributes, roomIds, collectionIds populated. (see `apps/api/scripts/seed-store.ts`)

**Client-side Filtering:** NONE in ProductsPage or useProducts except price sorting. All filtering server-side.

**Key Mismatch:** "festive" - if requested, no Collection with slug 'festive' exists; backend ignores unknown collection slugs (doesn't filter). Also no festive in any seed data/tags.
