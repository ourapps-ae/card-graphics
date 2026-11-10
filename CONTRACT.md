# Card graphics component

## Purpose and facilities
`card-graphics` draws a 52 card pack: a face with the rank over a small suit mark in two corners and either pips laid out as on a printed card (2 to 10), a large suit mark (ace) or, when the application supplies pictures, a court picture (jack, queen, king); a back (stripes, plain, or a picture); an empty slot; a card that arrives from the deck on a schedule; and a card that turns over. The rank is printed in the player's language through a function the application passes in (J is V in French). Sizes follow the card's width, 1.4 times taller than wide. The layout of pips, the schedule of a deal and the shape of a flip are pure data (`card-model`), the same on every platform.

Facilities: `card-graphics` (Card faces, backs, slots, dealing and flipping).

## User inputs
`backStyle` is `stripes` (default), `plain` or `art`; `art` uses back pictures the application supplies and falls back to stripes where there are none. `cornerStyle` is `rounded` (default), `soft` or `square`. `cardWidth` is the default width in pixels (8 to 600), used when a call gives no width. Card colours come from the theme: `paper` (face), `paperAccent` (red suits and the back), `onPrimary` (black suits).

- `backStyle` (string, identifier; optional; default `stripes`)
- `cornerStyle` (string, identifier; optional; default `rounded`)
- `cardWidth` (integer; optional; default `56`)

## Artefacts and dependencies
`component.json` maps every `implementation/` source into `components/card-graphics/`:

- `implementation/android/src/main/java/ae/cards/CardModel.kt` -> `components/card-graphics/android/src/main/java/ae/cards/CardModel.kt`
- `implementation/android/src/main/java/ae/cards/PlayingCard.kt` -> `components/card-graphics/android/src/main/java/ae/cards/PlayingCard.kt`
- `implementation/apple/Sources/CardModel.swift` -> `components/card-graphics/apple/Sources/CardModel.swift`
- `implementation/apple/Sources/PlayingCard.swift` -> `components/card-graphics/apple/Sources/PlayingCard.swift`
- `implementation/web/card-model.ts` -> `components/card-graphics/web/card-model.ts`
- `implementation/web/cards.css` -> `components/card-graphics/web/cards.css`
- `implementation/web/cards.ts` -> `components/card-graphics/web/cards.ts`

Dependencies: none.
`tools.lock.json` pins verification tools: node 26.5.0, python3 3.12.8, swiftc 6.4.2, kotlinc 2.2.0, java 26.0.1. Licence wording remains deferred.

## Provided interfaces
- `interfaces/card-graphics.json` defines `card-graphics` (ae/card-graphics) version 1.0.0 as an OpenRPC 1.3.2 document: one method per web function, each description naming the Swift and Kotlin form or saying it is web only, with card codes, settings, face models, deal steps and pip layout as JSON Schema 2020-12 under `components.schemas`. Picture lookups, rank labels and DOM elements are described as host values, not serialised.

## Required interfaces
- `theme` (ae/theme) version 1.0.0, supplied by the recipe or application. Its interface document is a copy of the theme component's OpenRPC document; card-graphics reads the theme's `--paper`, `--paper-accent`, `--on-primary` and `--primary` CSS variables (web) and `ThemeSet` colours (Swift, Kotlin).

## Integration
Web: link `web/cards.css` after the theme's CSS; call `cardEl(code, { settings, width, theme, artFor, rankLabel })` for a face or, with `null`, a back; `cardSlot` for an empty place; `dealPlan` or `dealRounds` to schedule a deal and `dealInto` to animate one card from the deck's offset; `flippingCard(from, to)` for a turn. Pass `artFor` to say where artwork files are (`card-back-<theme>.png`, `card-<theme>-jack|queen|king.png`) or omit it to draw everything in code. Apple: compile `CardModel.swift` anywhere and `PlayingCard.swift` in UIKit targets with the theme's Swift files; set `.cardStyle(CardStyle(...))` once; use `PlayingCard`, `CardSlot`, `DealtCard`, `FlippingCard`. Android: add `CardModel.kt` and `PlayingCard.kt` to a Compose module with the theme's Kotlin files; provide `LocalCardStyle`. Which cards exist, who holds them, the logo, hand underlines, the possible-hands panel and showdown layouts stay in the recipe.

## Visual definition and connected examples
`visual/definition.json` maps its ports to the provided and required interfaces. `visual/examples/connected.json` connects the component to an illustrative application consumer. Both image formats and a text description are retained under `visual/output/`.

## Infrastructure
None. Local drawing only; no accounts, network or deployment.

## Verification
Node tests check that all 52 codes parse and nothing else does, pip counts equal the rank and the lower half is upside down, face models for red and black suits, ranks in another language, aces, court pictures and backs with and without artwork, settings validation, sizes, the deal schedule (three cards a second), dealing round the table, the flip curve, and the DOM produced by `cardEl`, `cardSlot`, `dealInto` and `flippingCard` (including the face swap at the half turn) against a stand-in page, and that the OpenRPC interface's card code pattern, settings, pip ranks and face model shapes match the code and every method it lists is an exported web function. The Apple check compiles and runs `tests/apple/main.swift` for macOS, comparing all 52 faces, backs, metrics, deal and flip with the TypeScript output, then type-checks all Swift with the theme's against the iOS simulator SDK. The Android check compares the same 52 faces (`tests/android/Expected.kt`); kotlinc was not available where this was written, so it has not been run, and `PlayingCard.kt` (Compose) is only compiled by the application's Gradle build. Pixels are not compared.

- `node --test tests/web.test.ts` (web, required-local; tools: node 26.5.0)
- `python3 tests/native.py apple` (apple, platform; tools: python3 3.12.8, swiftc 6.4.2)
- `python3 tests/native.py android` (android, platform; tools: python3 3.12.8, kotlinc 2.2.0, java 26.0.1)

## Scenarios and presentation
A table draws five community cards, some as empty slots; a deal sends two cards to each seat one after another from the deck's position; a showdown turns a seat's cards over; a French player sees V, D, R for jack, queen, king; a recipe with its own artwork passes `artFor` and gets pictured backs and courts, while one without gets the code-drawn cards.

## Updates and removal
Patch updates replace files only. The component keeps no data; removal deletes its files and the application's imports of them.
