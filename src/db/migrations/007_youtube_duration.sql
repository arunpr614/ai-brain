-- v0.5.1 T-YT-2 — YouTube capture: duration for video items.
-- Nullable; non-video items leave it null.
ALTER TABLE items ADD COLUMN duration_seconds INTEGER;
