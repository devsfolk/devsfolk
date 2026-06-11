# Bugfix Requirements Document

## Introduction

This document covers four defects in the Printify POD (Print-on-Demand) storefront integration:

1. **Order Placement Failure** — Customized orders successfully reach the cart but fail when submitted to Printify because the `print_areas` field in `buildPrintAreasForItem` is generated as a plain object `{ [position]: artworkUrl }` instead of the array-of-objects format Printify's API requires.

2. **Incorrect / Identical Pricing** — Every raw template in the editor shows the same static price instead of a per-template price derived from the Printify provider's base cost plus the admin-configured profit margin percentage. Price also fails to update when the customer selects a larger variant (e.g. XXL).

3. **Color Swatches Not Visible** — No color selection options are shown in the editor for raw template items because the Template Sync process stores raw Printify option IDs (e.g. `[10, 12]`) instead of resolved human-readable titles and hex codes, making the variant color extraction logic produce empty results.

4. **Customer-Facing System Note Cleanup** — A technical system note ("Orders automatically sync to Printify POD warehouses upon payment validation") is visible to customers in the editor footer and must be removed.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a customized Printify order is submitted to the backend fulfillment bridge THEN the system sends `print_areas` as a plain key-value object `{ "front": "<artworkUrl>" }` which Printify's API rejects with a validation error

1.2 WHEN a raw Printify template is displayed in the storefront editor THEN the system shows the same fallback price (e.g. `$24.99`) for every template regardless of the Printify provider's actual base cost or the admin's configured profit margin percentage

1.3 WHEN a customer selects a larger variant (e.g. XXL) in the storefront editor THEN the system does not update the displayed price to reflect any variant-level price difference

1.4 WHEN Template Sync fetches variants for a blueprint THEN the system stores raw Printify option IDs (integers such as `10`, `12`) in variant option fields instead of resolved human-readable titles and hex color codes

1.5 WHEN the editor renders color swatches for a raw template product THEN the system produces an empty color options list because `getVariantColor` cannot extract a name or hex from numeric IDs

1.6 WHEN the storefront editor footer is rendered THEN the system displays the customer-facing note "Orders automatically sync to Printify POD warehouses upon payment validation"

---

### Expected Behavior (Correct)

2.1 WHEN a customized Printify order is submitted to the backend fulfillment bridge THEN the system SHALL format `print_areas` as a Printify-compatible array: `[{ variant_ids: [<variantId>], placeholders: [{ position: "<position>", images: [{ id: "<mediaId>", x: 0.5, y: 0.5, scale: 1, angle: 0 }] }] }]`

2.2 WHEN a raw Printify template is displayed in the storefront editor THEN the system SHALL calculate and display a price equal to the Printify provider's base cost for that template multiplied by `(1 + profitMarginPercent / 100)` as configured by the admin in Dashboard → Printify Settings → Charges

2.3 WHEN a customer selects a variant (e.g. XXL) in the storefront editor THEN the system SHALL update the displayed price to reflect that variant's cost (from Printify if available) with the admin profit margin applied, falling back to the template base cost formula if Printify does not provide per-variant pricing

2.4 WHEN Template Sync fetches blueprint variant data from Printify THEN the system SHALL resolve each option ID to its human-readable title and, for color-type options, to its hex color code by fetching blueprint details from the Printify API before saving variants

2.5 WHEN the editor renders color swatches for a raw template product that has color variant data THEN the system SHALL display selectable color swatches using the resolved hex codes or color name labels from the enriched variant metadata

2.6 WHEN the storefront editor footer is rendered THEN the system SHALL NOT display the note "Orders automatically sync to Printify POD warehouses upon payment validation"

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a customer adds a customized product to the cart THEN the system SHALL CONTINUE TO preserve all Printify fulfillment metadata on the cart item (`printifyBlueprintId`, `printifyPrintProviderId`, `printifyVariantId`, `printifyPrintAreas`)

3.2 WHEN an existing Printify shop product (with a real Printify product ID) is submitted for fulfillment THEN the system SHALL CONTINUE TO send the order using the `product_id` + `variant_id` line item format without modifying the print areas logic for that path

3.3 WHEN a customer selects a template in the editor THEN the system SHALL CONTINUE TO show the template preview image and allow text/image customization on the Fabric.js canvas

3.4 WHEN the admin runs Template Sync in Dashboard → Printify Settings THEN the system SHALL CONTINUE TO fetch blueprints, providers, and variants and save them to the Printify catalog store

3.5 WHEN Printify artwork is a data URL (PNG/JPG) THEN the system SHALL CONTINUE TO upload it to the Printify Media Library and return a public URL before building the fulfillment payload

3.6 WHEN a Printify order fails fulfillment THEN the system SHALL CONTINUE TO write the `FAILED` status and error log to the order record and display it in Dashboard → Printify → Orders

3.7 WHEN the mobile storefront or mobile dashboard layout is rendered THEN the system SHALL CONTINUE TO display without any change to mobile-specific styles or responsive layout (mobile views are locked per AGENTS.md)

3.8 WHEN a customer is viewing the storefront editor THEN the system SHALL CONTINUE TO hide internal pricing details (margin, markup, cost) and show only the final customer-facing product price

---

## Bug Condition Pseudocode

### Bug 1 — Order Placement: Malformed `print_areas`

```pascal
FUNCTION isBugCondition_PrintAreas(lineItem)
  INPUT: lineItem of type PrintifyLineItemPayload
  OUTPUT: boolean

  RETURN lineItem.print_areas IS plain object (NOT an array)
END FUNCTION

// Property: Fix Checking
FOR ALL lineItem WHERE isBugCondition_PrintAreas(lineItem) DO
  result ← buildPrintAreasForItem'(lineItem)
  ASSERT result IS array
  ASSERT result[0].placeholders IS array
  ASSERT result[0].placeholders[0].images IS array
  ASSERT result[0].placeholders[0].images[0].id IS non-empty string
END FOR

// Property: Preservation Checking
FOR ALL lineItem WHERE NOT isBugCondition_PrintAreas(lineItem) DO
  ASSERT buildPrintAreasForItem(lineItem) = buildPrintAreasForItem'(lineItem)
END FOR
```

### Bug 2 — Pricing: Identical Static Prices

```pascal
FUNCTION isBugCondition_Pricing(template)
  INPUT: template of type PrintifyCatalogTemplate
  OUTPUT: boolean

  RETURN template.baseCost IS defined AND
         displayedPrice = hardcoded_fallback (e.g. 24.99) AND
         displayedPrice ≠ template.baseCost * (1 + profitMarginPercent / 100)
END FUNCTION

// Property: Fix Checking
FOR ALL template WHERE isBugCondition_Pricing(template) DO
  result ← calculateTemplateRetailPrice'(template.baseCost)
  ASSERT result = template.baseCost * (1 + profitMarginPercent / 100)
END FOR

// Property: Preservation Checking
FOR ALL template WHERE NOT isBugCondition_Pricing(template) DO
  ASSERT calculateTemplateRetailPrice(template.baseCost) = calculateTemplateRetailPrice'(template.baseCost)
END FOR
```

### Bug 3 — Color Swatches: Unresolved Option IDs

```pascal
FUNCTION isBugCondition_ColorOptions(variant)
  INPUT: variant of type PrintifyVariant
  OUTPUT: boolean

  RETURN variant color option value IS integer (option ID)
         AND NOT human-readable string or hex code
END FUNCTION

// Property: Fix Checking
FOR ALL variant WHERE isBugCondition_ColorOptions(variant) DO
  result ← getVariantColor'(variant)
  ASSERT result IS non-empty string (hex code or color name title)
END FOR

// Property: Preservation Checking
FOR ALL variant WHERE NOT isBugCondition_ColorOptions(variant) DO
  ASSERT getVariantColor(variant) = getVariantColor'(variant)
END FOR
```
