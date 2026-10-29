# Trading indicators

Chart indicators for TradingView (Pine Script v6) and Tradovate (JavaScript).

```
tradingview/
  volume-profile/   Multi-timeframe previous volume profile, v1 to v6
  phoenix_combo.pine
tradovate/
  footprint_bid_ask.js
  stacked_imbalances_extend.js
```

## TradingView

### Multi-timeframe previous volume profile (`tradingview/volume-profile/`)

Draws the volume profile of each *completed* period (for example yesterday, last week and last month) on a lower-timeframe chart: the point of control (POC), the value area high and low (VAH/VAL, 70% of volume by default) and, from v3 on, the period's VWAP. Profiles are built from lower-timeframe bars, so they stay smooth whatever the chart timeframe. Levels can stop at the end of their period or extend until price breaks them.

The six files are successive versions of the same idea, kept to show how it developed:

| Version | What changed |
|---|---|
| v1 | Up to three profiles (default daily, weekly, monthly). Buy/sell split histograms, POC/VAH/VAL, separate lookbacks for histograms and levels. First draft: fails on some low chart timeframes (fixed in v2) |
| v2 | Works on any chart timeframe, down to 1 minute. Choice of how a bar's volume is spread over prices (proportional, HLC3, uniform). Rows set by count or by ticks per row. Histogram on the left or right |
| v3 | Shorter settings menu; lower timeframe and drawing budget chosen automatically. VWAP line per completed profile |
| v4 Weekly/Monthly | Two profiles (default weekly and monthly) with full histograms; the drawing budget is split 2/3 and 1/3 between them. VWAP drawn as a curve that resets each period |
| v5 | Past histograms dropped; past POC/VAH/VAL and VWAP kept. One developing histogram drawn to the right of the latest candle, from profile 1 or 2 |
| v6 | As v5 with three profiles (default daily, weekly, monthly); the developing histogram can come from any of them |

### Phoenix Combo (`tradingview/phoenix_combo.pine`)

One overlay that combines two public TradingView scripts: "Phoenix B-Bands WyckoffMode" by WyckoffMode, and "Ichimoku, 3 BB, Multi MAs". It shows:

- Phoenix Bollinger Bands: a basis line with upper and lower bands at 1.0, 1.618, 2.618, 3.618 and 4.618 standard deviations, plus the spread in % between neighbouring bands (optional fill above a threshold).
- Rainbow Bollinger Bands with two band widths.
- Ichimoku cloud.
- Up to 8 moving averages (simple or exponential).

This file is under the Mozilla Public License 2.0, inherited from its source (see its first line).

### Load in TradingView

1. Open a chart and the **Pine Editor** (bottom panel).
2. Replace the editor's contents with the file's code.
3. Click **Add to chart**. Settings are in the indicator's settings dialog.

## Tradovate

### Footprint, bid/ask bars (`tradovate/footprint_bid_ask.js`)

A changed version of MarketXero's "Delta Footprint" (itself built on the "Hector - Footprint" and Sethmo footprint indicators). Each candle shows its volume at every price. This version replaces the original's delta and total-volume bars with separate bid and ask volume bars, each with its own colour. Kept from the original: compact mode, POC and value-area lines, divergence icons and absorption labels. Uses Tradovate's per-price bid/ask volume.

### Stacked imbalances, extended (`tradovate/stacked_imbalances_extend.js`)

A changed version of Latter-day Trader's "LDT - Stacked Imbalances (for New Charts)". It marks price zones where buyers or sellers outweighed the other side on several prices in a row (default: 3 prices, 300% imbalance). Changes from the original: each zone's box extends to the right until price trades back through it, box opacity is a setting, and sell zones default to pink.

### Load in Tradovate

1. Open **Code Explorer** and create a new indicator.
2. Replace its code with the file's contents and save.
3. Add the indicator to a chart from the indicator list.

## Credits

Built by iixo3. Phoenix Combo and the two Tradovate indicators build on the public scripts credited above; their authors' original notes are kept in each file's header.

No licence is granted for this repo's own work: it can be viewed, not reused. `phoenix_combo.pine` keeps its Mozilla Public License 2.0.
