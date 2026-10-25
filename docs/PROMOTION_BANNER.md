# First-row promotion banner

The supplied bracelet image appears directly after the first complete row
of source cards, spanning the content grid. It follows three cards on desktop
(1200px and wider), two on tablet (640–1199px), and one on mobile. If a Followed
list has fewer cards, it follows that partial row. Empty lists have no banner.
Its placement does not add a source ID or a draggable item.

The image links exactly to `https://kailashenergy.com/vullnetdemiri`, opening
in a new tab with `sponsored noopener noreferrer`. A localized Sponsored feature
label and image description are provided. The original asset has no added
text or overlays. The banner frame uses the photograph's original 3:1 ratio,
spanning the content grid. The complete photograph is displayed proportionally
with `object-fit: contain`, without side fills, cropping or distortion.
Responsive image sizes reflect the full-width photograph.

The original image is 2172×724 (3:1), approximately 3.4 MB. Responsive WebP
assets preserve that ratio at 480, 960 and 1920 pixels wide, approximately
26 KB, 100 KB and 296 KB. The browser selects an appropriate version; image
dimensions reserve layout space, and loading is deferred with low fetch
priority. Fingerprinted filenames use the existing immutable asset cache.

The component and link live in `src/components/column/advertisement.tsx`.
Placement is shared by the ordinary source grid and the sortable Followed
grid. The existing layout, source ordering, refresh controls and twelve
interface languages are preserved.
