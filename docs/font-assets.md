# Font subsets

The original self-hosted Cormorant and Manrope WOFF2 files and OFL licenses were preserved in commit `0b5992c`. The current assets split each original font into a common Latin/combining/punctuation/currency face and an extended face. The original Unicode cmap is partitioned without dropping codepoints. Variable weight axes and layout features are retained. Chinese continues to use the existing system fallback.

Common faces total 144,444 bytes, down from 262,936 bytes (45% less font payload for the ordinary Chinese/English UI). Extended faces load only when their declared Unicode ranges occur; they retain the original Cyrillic, Greek, Vietnamese and symbol coverage. They are not eagerly preloaded. Combined on-disk bytes are not a page's transferred payload.

Subsetting used the isolated fontTools/Brotli tools under `/tmp/melody-font-tools`, not an application runtime dependency. The common range is U+0000–024F, U+0300–036F, U+2000–206F, U+20A0–20CF, U+2113, U+FEFF and U+FFFD. Each extended face is the original cmap minus those ranges; its CSS Unicode list is generated from the remaining actual codepoints. All layout features are retained and timestamps are not recalculated. Both output cmaps were checked against the intended partition.

The homepage hints the real island fetch during rendering via React's preload API. Other routes do not preload the island. Verify one network model transfer and compare scene readiness in the same cold-cache throttled profile; text LCP alone cannot confirm this optimization.
