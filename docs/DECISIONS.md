# Technical Decisions

## Expo managed workflow

Use Expo for quick setup, consistent native configuration, and access to SQLite, filesystem, and image components. Use a development build if production configuration exceeds Expo Go capabilities.

## Zustand + TanStack Query

Zustand is a small store for user-controlled filter/search preferences. TanStack Query handles remote operation status, retries, and invalidation. SQLite remains the source of truth for offline breed data; do not treat an in-memory query cache as durable offline storage.

## SQLite schema

- `breeds(id TEXT PRIMARY KEY, name TEXT NOT NULL, group_id TEXT, attributes_json TEXT NOT NULL, updated_at TEXT NOT NULL)`
- `groups(id TEXT PRIMARY KEY, name TEXT NOT NULL, attributes_json TEXT NOT NULL, updated_at TEXT NOT NULL)`
- `sync_metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL)`
- Optional `cached_images(image_id TEXT PRIMARY KEY, breed_id TEXT NOT NULL, local_uri TEXT NOT NULL, bytes INTEGER NOT NULL, last_accessed_at TEXT NOT NULL)`

JSON is retained for rich, evolving nested attributes, while frequently filtered fields such as name and group ID are indexed/duplicated into columns. Add indexes on `breeds(name)` and `breeds(group_id)`. Keep database writes inside transactions.

## Pagination and synchronization

Do not assume exactly six pages forever. Start at page 1 with `page[size]=48`, inspect the API pagination metadata, and fetch subsequent pages until `next` is absent. Use a bounded number of concurrent requests, deduplicate by breed ID, and atomically upsert validated pages. If partial sync is needed, persist successful pages without deleting older rows and mark the sync as partial; only mark the whole dataset fresh after all expected pages succeed.

## List performance trade-off

283 records is not a large row count by itself. The real cost is each row's nested traits, coat, origins, relationship data, and multiple image URLs. Keep list rows lightweight: precompute searchable/filterable fields, select one thumbnail URL, memoize rows, use stable keys, and avoid recreating large objects in render. Avoid loading all gallery images into memory. Profile on mid-range hardware and measure frame time and memory before claiming the 60fps / 150MB targets.

## Image caching

Use `thumb` for list rows and `medium` for detail images. Cache large/full images only when a user opens a gallery or explicitly saves one. Apply a bounded disk budget (for example 100 MB), least-recently-used eviction, and a maximum number of saved gallery images. Keep image attribution next to the image and in gallery details.

## Size bands

Treat size as a derived estimate, not a source fact. Use maximum of male/female weight range where present, with documented thresholds and a fallback to height. Mark unknown size when neither is available. Avoid silently assigning missing values to medium.

## Errors and accessibility

Normalize network/validation/database failures into typed app errors. Error boundaries should wrap major route groups. All interactive elements need accessible labels, sensible hit targets, and screen-reader descriptions for trait scales.
