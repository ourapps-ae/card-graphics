# Source mapping

Reference revision: `19905b75dbea89fbfd424d67fe26c81aaed0e018`. Extracted from `OurPoker/recipe/` (read-only); line ranges are of the files there.

## Web

- `implementation/web/card-model.ts` <- `web/src/dom.ts:18-65` (suit glyphs, court names, `rankText`, `PIPS` and their rows, `cardTheme`/art lookup) and the decisions inside `cardEl` (`dom.ts:71-91`: which face has a court picture, an ace mark, pips or a letter). Split from drawing so it is pure and shared with Swift and Kotlin. Generalised: `L("rank_" + r)` became a `rankLabel` argument; the module-level `cardTheme` and `artFiles` became `theme` and `artFor` arguments; `backStyle`, `cornerStyle` and `cardWidth` settings, `CORNER_RADIUS`, `parseCard`, `allCards`, `normaliseSettings` and `centreBox` are new (`generated-platform`). `dealPlan` and `dealRounds` generalise the deal timing in `web/src/table.ts:213-240` (`DEAL_MS` 350, `DEAL_GAP` 340, two rounds round the seats) and `ios/OurPoker/Sources/Chips.swift:219-243`. `flipState` is new (`generated-platform`): the recipe has a flip sound (`web/src/sound.ts`, `ios/.../TableModel.swift:328`) but no card-turning animation, so the curve is written from scratch.
- `implementation/web/cards.ts` <- `web/src/dom.ts:71-91` (`cardEl` markup: `index tl`, `index br`, `box`, `p`, `court`, `ace`, `flip`, `small`, `rank ten`), with card dimensions (`height = width * 1.4`, `fontSize = width / 10`). Slot is the `card slot` markup at `web/src/table.ts:638` and `web/src/board.ts:45`. Left behind: `loadArtManifest` (`dom.ts:53-61`, fetching `art/manifest.json` is the application's), `chips()` (to `controls`), the `logo` and the hand-underline and possible-hands styling.
- `implementation/web/cards.css` <- `web/src/style.css:119-140` (cards) and `style.css:78-81` is in `controls`. Colours `#f6f1e4`, `#1b1a17`, `#c0262d` became the theme's `--paper`, `--on-primary`, `--paper-accent`; the back stripes are drawn from `--paper-accent`. Deal and flip keyframes are new. Left behind: `.lined`, `.handcard`, `.tok`, `.holecards`, `.zoom*`, `.showcase`, `.challenge` and the other table styles (`style.css:141-359`).

## Apple

- `implementation/apple/Sources/CardModel.swift` <- `ios/OurPoker/Sources/Cards.swift:3-42` (suit glyph, court name, pip layout) and the deal timing in `Chips.swift:219-223`. Same API shape as the web model; no UI framework so it compiles and is tested without UIKit.
- `implementation/apple/Sources/PlayingCard.swift` <- `Cards.swift:44-135` (`PlayingCard`, `index`, environment key) and `149-158` (`CardSlot`), `137-149` (`tapIf` -> `cardTap`). `Art.image` lookups, `Palette.*` and `L("rank_...")` became `CardStyle` (settings, theme tokens, image lookup, rank labels). `DealtCard`, `FlippingCard` and the tap halo are new (`generated-platform`; the halo is `PulseHalo.swift` of `controls`, copied small so `card-graphics` does not depend on `controls`). Left behind: `legendLine`, `Logo`, `SeatNumber` (`Cards.swift:160-191`).

## Android

- `implementation/android/src/main/java/ae/cards/CardModel.kt` <- `android/app/src/main/java/app/ourapps/ourpoker/ui/Cards.kt:48-80` (glyphs, court names, pips), as the Swift model.
- `implementation/android/src/main/java/ae/cards/PlayingCard.kt` <- `ui/Cards.kt:82-175` (`PlayingCard`, `CornerIndex`, `CardSlot`). `CardFace`, `CardRed`, `Ink` constants, `artPainter` resource lookups (`getIdentifier`) and `rankText` became `CardStyle`. `DealtCard`, `FlippingCard` are new (`generated-platform`). Left behind: `LegendLine`, `Logo` and `pulseHalo` (`Cards.kt:165-191`, the last is in `controls`).

## Tests

`tests/web.test.ts`, `tests/fake-dom.ts`, `tests/make-fixtures.ts`, `tests/fixtures/cards.json`, `tests/apple/main.swift`, `tests/android/Main.kt`, `tests/android/Expected.kt`, `tests/native.py`, `examples/consumer.ts` are new. `cards.json` and `Expected.kt` are generated from the TypeScript; the web test fails if they drift.

## Differences from the recipe

The recipe used a back picture whenever the file existed; here a picture is used only when `backStyle` is `art` (the default `stripes` draws the code-drawn back), so the recipe sets `backStyle` to `art` to keep its behaviour. The `plain` back, `soft` and `square` corners, the `cardWidth` setting and dealing and flipping as components are additions.
