-- 004_items_add_quotes.sql — v0.3.0 F-203
-- Store the 5 key quotes from the enrichment pipeline on the item row.
-- JSON-encoded array of strings. Rendered in the dual-pane view (F-204).

ALTER TABLE items ADD COLUMN quotes TEXT;
