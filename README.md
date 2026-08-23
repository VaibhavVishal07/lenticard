# lenticard

Give someone a card they have to tilt.

Two or three photos become one card that changes as it moves, the way a printed
lenticular card does. Write a note, send the link, and they open a sealed card
with your name on it.

Underneath the gifting is a small open-source library: the card is a React
component, a self-registering web component, or one plain function, with no
runtime dependencies and about 9 kB gzipped.

**[Open it →](https://vaibhavvishal07.github.io/lenticard/)**

---

## Sending a card

1. Drop in two to six photos. The card's shape comes from their aspect ratio, so
   landscape frames make a wide card and portrait frames a tall one.
2. Pick an occasion, write who it is from, add a line.
3. Send the link.

The card travels **inside the link**. There is no account, nothing to upload, and
nothing that expires — a 50 kB URL carries three compressed frames, the lens
settings, and your note. That is why the site works as a plain static deploy.

Long URLs paste fine but some apps abbreviate what they display. If you would
rather hand out short `?c=<id>` links, connect a store (below) and lenticard
switches to it automatically.

## Using the card in your own project

```sh
npm install lenticard
```

| Entry | What you get | Gzipped |
| --- | --- | --- |
| `lenticard` | core + `createLenticularCard()` | ~9.5 kB |
| `lenticard/react` | `<LenticularCard />` | ~1 kB + core |
| `lenticard/element` | `<lenticular-card>`, self-registering | ~9.2 kB |

### React

```tsx
import { LenticularCard } from 'lenticard/react';

export function Hero() {
  return (
    <LenticularCard
      images={['/frames/a.jpg', '/frames/b.jpg', '/frames/c.jpg']}
      caption="Three frames, one card"
      width={480}
    />
  );
}
```

Every option is a prop, and changing one patches the live card rather than
remounting it. A ref gives you `setAngle`, `enableGyro`, `toBlob` and the canvas.

### Anything else

```html
<script src="https://cdn.jsdelivr.net/npm/lenticard/dist/lenticard-element.iife.js"></script>

<lenticular-card
  style="width: 480px"
  images="/frames/a.jpg,/frames/b.jpg,/frames/c.jpg"
  lenticules="110"
></lenticular-card>
```

A comma is legal inside a URL, so pass a JSON array when yours contain one:
`images='["/a.jpg", "/b.jpg"]'`. Setting the `.images` property instead takes
`File`s, `Blob`s and decoded images straight from an upload input.

### Plain JavaScript

```js
import { createLenticularCard } from 'lenticard';

const card = createLenticularCard('#mount', {
  images: [first, second],
  lenticules: 110,
});
card.update({ sheen: 0.6 });
card.destroy();
```

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `images` | — | 2–6 frames. URLs, `File`/`Blob`, `HTMLImageElement`, `ImageBitmap`, `HTMLCanvasElement`. First reads at full left tilt, last at full right. |
| `orientation` | `auto` | `auto` derives the shape from the frames. Or `landscape`, `portrait`, `square`, `circle`. A round card is opt-in; auto never picks it. |
| `axis` | `auto` | Which way the ridges run. `auto` puts them across the card's longer side. |
| `lenticules` | `96` | Ridges across the card. Higher is a finer interlace. |
| `parallax` | `1` | How far a tilt pushes through the frame stack. |
| `interlace` | `0.22` | How much of the stack one ridge reveals. Raise it to see the strips. |
| `blend` | `0.35` | `0` snaps between frames, `1` dissolves. |
| `sheen` | `0.35` | Specular highlight riding each ridge. |
| `lens` | `0.5` | Refraction at the ridge edges. |
| `tilt` | `14` | Maximum card rotation, in degrees. |
| `float` | `8` | Idle bob in px. `0` turns it off. |
| `radius` | `20` | Corner radius in px. Ignored by a round card. |
| `fit` | `cover` | How a frame fills a card of a different aspect ratio. |
| `motion` | `pointer` | `pointer`, `gyro`, `auto`, or `none`. On a touch device `pointer` uses the gyroscope, because there is no cursor to follow. |
| `idleSweep` | `2600` | Sweep on its own after this many ms of stillness. `0` disables. |
| `caption` | — | A line under the card. |
| `respectReducedMotion` | `true` | Hold still for `prefers-reduced-motion: reduce`. |

`onReady({ orientation, axis, aspect })` fires once the frames decode, which is
when the card knows its shape. `onError(error)` fires if a frame fails.

## How it works

A lenticular print interleaves strips of several pictures under a sheet of tiny
cylindrical lenses. Each lens refracts a different strip toward your eye
depending on where you stand, so the picture changes as you move.

lenticard runs the same arithmetic per pixel in a fragment shader. For each
pixel it works out where that pixel sits under its ridge, adds the viewing
angle, and reads the frame that combination points at, blending adjacent frames
across the crossover. The blend widens with the pixel's footprint in ridge
space, which is what keeps a fine interlace from turning into moiré on a
high-DPI screen.

Around that it is ordinary DOM: a CSS 3D transform for the tilt and float, a
radial gradient tracking the pointer for the glare, and a shadow that swings the
other way. A critically damped spring smooths the input, so the card settles
instead of snapping.

It is deliberately raw WebGL — one triangle, one shader. A widget you drop into
someone else's page has no business shipping a scene graph.

### Details worth knowing

- **On a phone the gyroscope drives it.** Tilt is deeper and the shadow throws
  further when the card is being held, so it reads as floating off the glass.
  iOS needs a tap first; `enableGyro()` handles the prompt.
- **A card at rest stops drawing.** The context keeps its buffer, so a still
  card costs nothing.
- **Off-screen cards pause.** An `IntersectionObserver` stops the loop, which
  matters when the card is far down someone else's page.
- **No WebGL, no blank box.** It falls back to a DOM stack that crossfades the
  frames under a printed ridge texture. A stack cannot refract, so it cannot
  pick one frame per angle, but the card still reads and still moves.
- **Context loss is handled.** Textures and program rebuild on restore.
- **Cross-origin frames** are requested with `crossOrigin="anonymous"` so
  `toBlob()` does not hit a tainted canvas.

## The editor

`npm run dev` opens it. Drop in two to six photos, reorder them, adjust ridges,
shift and shine, then send. The default card is three deliberately unrelated
images, drawn on a canvas at runtime — a lenticular card only reads as one when
the frames disagree. Swap `buildDefaultCard` for real photographs.

## Optional: short links

Copy `.env.example` to `.env` and point it at a
Supabase project:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_SUPABASE_BUCKET=cards
```

With those set, links become `?c=<id>` instead of carrying the card inline.
Without them the link is self-contained, which is what the demo runs on.

The Supabase path is written against its REST API with no SDK, and has not been
exercised against a live project.

## Development

```sh
npm install
npm run dev        # editor at localhost:5173
npm run build      # library + web component + studio
npm run typecheck
```

| Script | Output |
| --- | --- |
| `build:lib` | `dist/lenticard.{js,cjs}`, `dist/lenticard-react.{js,cjs}`, types |
| `build:element` | `dist/lenticard-element.{js,iife.js}` |
| `build:studio` | `dist-studio/` |

## Browser support

Anything with WebGL 1, which is every current browser and Safari back to 12; the
fallback covers the rest. The theme switch uses the View Transitions API where
it exists and swaps instantly where it does not.

## Licence

MIT
