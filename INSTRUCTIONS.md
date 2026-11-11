# Card graphics instructions

## For the agent
Select `ourapps-ae/card-graphics`; connect `theme` to the theme component. Set `backStyle`, `cornerStyle` and `cardWidth` from the recipe's look answer only if the user asked for something other than the defaults. Rank labels come from the `translations` component (keys the recipe defines); do not add strings here.

- Select package `ourapps-ae/card-graphics` version `0.4.1`.
- Settings to configure:
  - `backStyle` (string, identifier; optional; default `stripes`)
  - `cornerStyle` (string, identifier; optional; default `rounded`)
  - `cardWidth` (integer; optional; default `56`)
- Connect the provided `card-graphics` (ae/card-graphics 1.0.0, OpenRPC 1.3.2 document `interfaces/card-graphics.json`) to the consumer that needs it.
- Supply `theme` (ae/theme 1.0.0) from the component that provides it.
- No accounts or keys are needed.

## For the developer
Supply card pictures (optional) named `card-back-<theme>.png` and `card-<theme>-jack|queen|king.png` and an `artFor` that finds them. Supply `rankLabel` if the application is translated. Keep `card-model` the single source of truth: change pip layouts there, regenerate fixtures with `node tests/make-fixtures.ts`, and update the Swift and Kotlin models to match.

## How to check
From the component directory:

- `node --test tests/web.test.ts` (web, required-local; tools: node 26.5)
- `python3 tests/native.py apple` (apple, platform; tools: python3 3.12, swiftc 6.4)
- `python3 tests/native.py android` (android, platform; tools: python3 3.12, kotlinc 2.2, java 26.0)
- `python3 -m aepm review <digest> --store STORE --policy POLICY --trusted --allow-network` checks an archive fetched with `python3 -m aepm fetch ourapps-ae/card-graphics@VERSION --store STORE --from https://ourapps.app` and runs its suites.
