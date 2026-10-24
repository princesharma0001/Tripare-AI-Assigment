# Performance Report

## Status

No measurements have been fabricated. Fill in this report after running a release build on a named device/simulator.

| Metric | Target | Measured result |
|---|---:|---|
| Cached cold start to interactive | < 3 s | TODO |
| Sustained scroll | 60 fps | TODO |
| Peak memory while scrolling | < 150 MB | TODO |
| Release JS bundle | Record actual size | TODO |
| Initial image cache footprint | Bounded | TODO |

## Method

1. Record device model, OS, Expo SDK, build type, and commit SHA.
2. Seed/sync the complete live breed dataset, then force-close and reopen offline.
3. Record cold and warm startup separately.
4. Scroll from first to last breed repeatedly with thumbnails visible; capture frame time/FPS and memory using Xcode Instruments or Android Studio Profiler.
5. Repeat with filters/search and open/close galleries.
6. Analyze the release bundle using the Expo export output and document JS/assets separately where the tooling permits.
7. Attach screenshots to `docs/screenshots/`; do not commit screenshots containing personal information.

## Optimization checklist

- Stable keys based on breed ID
- Memoized list row component and stable callbacks
- `FlatList` or FlashList with tuned window/batch settings based on profiling
- No inline expensive filtering over full nested objects on every keystroke
- Debounced search and precomputed normalized search strings
- Only thumbnail variant in list rows
- No eager download of all gallery photos
- Bounded network concurrency and SQLite transactions
- No fabricated performance numbers
