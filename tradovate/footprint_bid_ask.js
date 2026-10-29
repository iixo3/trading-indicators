// Footprint (bid/ask bars): a changed version of MarketXero's "Delta Footprint"
// (credits and version history of the original below). This version replaces the
// delta and total-volume bars with separate bid and ask volume bars, with their
// own colours.
//
// This script is modified by MarketXero for the Investitrade community
// from the 'Hector - Footprint' indicator, which was modified from the
// Sethmo footprint indicator
// v.1.0, delta vol, delta text, stick candle, and total volume have vertical separation and proper x-axis placement. Delta text color matches delta vol bars
// v.1.1, Resolve rounding error for tick so that it now rounds up tick instead of round down and better aligns with session volume profile price values
// v.1.2, Ensure inclusion of lowest bid value
// v.1.3, zero prints
// v.1.4, Resolve CL bars missing 
// v.1.4.1, Resolve CL bars missing - console logs 
// v.1.5.0, Compact mode
// v.1.6, remove 'priceLevelsPerBar'
// v.1.7, improve footprint use of vertical real estate in each period
// v.1.8, add diverge signal 
// v.1.8.1, update param names to improve the UX in the settings dialog
// v.1.9.0, POC
// v.1.9.1, resolve divergence and absorption not toggling on/off, and filterMinAbsorption not functioning

const predef = require("./tools/predef");
const meta = require("./tools/meta");
const { px, du, op } = require('./tools/graphics');

class barResDelta {
    init() {
        this.prevIndex = null;
        this.sessionVolumeProfile = {};
    }

    map(d, index) {
        if (this.prevIndex == null) {
            this.prevIndex = d.index();
            return;
        }

        // Reset volume profile data at the start of each bar
        this.sessionVolumeProfile = {};

        // Aggregate volume for finding POC and Value Area
        d.profile()
            .sort((a, b) => a.price - b.price)
            .forEach(({ price, vol }) => {
                const adjustedPrice = Math.round(price / this.contractInfo.tickSize) * this.contractInfo.tickSize;
                this.sessionVolumeProfile[adjustedPrice] = (this.sessionVolumeProfile[adjustedPrice] || 0) + vol;
            });

        let vPOCPrice = null; 
        let maxVolume = 0;
        let totalVolume = 0;
        let valueAreaHigh = null;
        let valueAreaLow = null;

        // Sort prices by volume to calculate Value Area
        const sortedPrices = Object.keys(this.sessionVolumeProfile)
            .map(price => ({ price: parseFloat(price), vol: this.sessionVolumeProfile[price] }))
            .sort((a, b) => b.vol - a.vol);

        // Calculate VPOC
        sortedPrices.forEach(({ price, vol }) => {
            totalVolume += vol;
            if (vol > maxVolume) {
                maxVolume = vol;
                vPOCPrice = price;
            }
        });

        // Calculate Value Area
        let volumeAccumulated = 0;
        for (let i = 0; i < sortedPrices.length; i++) {
            volumeAccumulated += sortedPrices[i].vol;
            if (volumeAccumulated / totalVolume >= this.props.valueAreaPercentage / 100) {
                valueAreaHigh = Math.max(...sortedPrices.slice(0, i + 1).map(item => item.price));
                valueAreaLow = Math.min(...sortedPrices.slice(0, i + 1).map(item => item.price));
                break;
            }
        }

        // New: Determine if compact mode is active
        const isCompactMode = this.props.compactMode;
        const verticalGap = this.contractInfo.tickSize * 0.1; // Space between price levels
        const halfTickShift = this.contractInfo.tickSize / 2;

        // Process raw profiles with grouping
        let groupedProfiles = [];
        let tickCounter = 0;
        let currentGroup = {};

        d.profile()
            .sort((a, b) => a.price - b.price)
            .forEach(({ price, vol, bidVol, askVol }) => {
                if (tickCounter % this.props.footprintTicksPerBar === 0) {
                    // Start a new group
                    if (currentGroup.price) {
                        groupedProfiles.push(currentGroup);
                    }
                    currentGroup = { vol: 0, bidVol: 0, askVol: 0, price: price };
                }
                
                // Combine volumes
                currentGroup.vol += vol;
                currentGroup.bidVol += bidVol;
                currentGroup.askVol += askVol;
                tickCounter++;

                // Handle the last group if it's not completed
                if (tickCounter === d.profile().length) {
                    groupedProfiles.push(currentGroup);
                }
            });

        // Rendering Containers
        const deltaBarsContainerPositive = {
            tag: 'Shapes',
            key: `askBars`,
            primitives: [],
            fillStyle: { opacity: 75, color: this.props.dominantAskColor },
        };

        const bidBarContainerNegative = {
            tag: 'Shapes',
            key: `bidBars`,
            primitives: [],
            fillStyle: { opacity: 75, color: this.props.dominantBidColor },
        };

        const totalBarsContainer = {
            tag: 'Shapes',
            key: `totalBars`,
            primitives: [],
            fillStyle: {
                opacity: 60,
                color: this.props.totalVolumeColor,
            },
        };

        const deltaVolContainer = {
            tag: 'Container',
            key: 'ask',
            children: [],
            conditions: {
                scaleRangeX: { min: this.props.footprintScaleFactorPx * 2.5 },
            },
        };

        const totalVolContainer = {
            tag: 'Container',
            key: 'bid',
            children: [],
            conditions: {
                scaleRangeX: { min: this.props.footprintScaleFactorPx * 2.5 },
            },
        };

        const stickCandleContainer = {
            tag: 'Shapes',
            key: `stickCandle${d.index()}`,
            primitives: [],
            fillStyle: {
                opacity: 99,
                color: d.close() > d.open() ? this.props.positiveCandleColor : this.props.negativeCandleColor,
            },
        };

        const openPrice = Math.min(d.open(), d.close());
        const closePrice = Math.max(d.open(), d.close());

        const maxVolumeInIndex = Math.max(...groupedProfiles.map(({ vol }) => vol)) || 1;
        const maxAskVol = Math.max(...groupedProfiles.map(({ askVol }) => askVol)) || 1;
        const maxBidVol = Math.max(...groupedProfiles.map(({ bidVol }) => bidVol)) || 1;

        // POC and Value Area rendering
        const vPOC = {
            tag: 'Shapes',
            key: 'volumeProfile',
            
            primitives: [],
            fillStyle: {
                opacity: this.props.vpocOpacity,
                color: this.props.vpocColor, 
            },
        };

        const valueAreaHighObj = {
            tag: 'Shapes',
            key: 'valueAreaHigh',
            
            primitives: [],
            fillStyle: {
                opacity: this.props.valueAreaOpacity,
                color: this.props.valueAreaHighColor,
            },
        };

        const valueAreaLowObj = {
            tag: 'Shapes',
            key: 'valueAreaLow',
            
            primitives: [],
            fillStyle: {
                opacity: this.props.valueAreaOpacity,
                color: this.props.valueAreaLowColor,
            },
        };

        let itemsToRender = [];

        // Add VPOC line
        if (vPOCPrice !== null) {
            vPOC.primitives.push({
                tag: 'Rectangle',
                key: `vPOCLine:${d.index()}`,
                position: {
                    x: du(d.index() + 0), 
                    y: du(vPOCPrice + (this.contractInfo.tickSize / 2) - halfTickShift) 
                },
                size: {
                    height: px(this.props.vpocThickness), 
                    width: px(this.props.vpocWidth * 40) 
                },
                fillStyle: {
                    color: this.props.vpocColor, 
                    opacity: this.props.vpocOpacity / 100.0 
                }
            });

            switch(this.props.pocAndValueAreaVisibility) {
                case 'showAll':
                    // Add Value Area High
                    if (valueAreaHigh !== null) {
                        valueAreaHighObj.primitives.push({
                            tag: 'Rectangle',
                            key: `valueAreaHigh:${d.index()}`,
                            position: {
                                x: du(d.index() + 0), 
                                y: du(valueAreaHigh + (this.contractInfo.tickSize / 2) - halfTickShift)
                            },
                            size: {
                                height: px(this.props.valueAreaThickness),
                                width: px(this.props.valueAreaWidth * 40) 
                            },
                        });
                        itemsToRender.push(valueAreaHighObj);
                    }

                    // Add Value Area Low
                    if (valueAreaLow !== null) {
                        valueAreaLowObj.primitives.push({
                            tag: 'Rectangle',
                            key: `valueAreaLow:${d.index()}`,
                            position: {
                                x: du(d.index() + 0), 
                                y: du(valueAreaLow + (this.contractInfo.tickSize / 2) - halfTickShift)
                            },
                            size: {
                                height: px(this.props.valueAreaThickness),
                                width: px(this.props.valueAreaWidth * 40) 
                            },
                        });
                        itemsToRender.push(valueAreaLowObj);
                    }
                    // fall through to include POC
                    
                case 'showPoc':
                    itemsToRender.push(vPOC);
                    break;
                    
                case 'shownone':
                    // Do nothing, no items will be added to render
                    break;
            }
        }

        groupedProfiles.forEach(({ vol, bidVol, askVol, price }) => {
            const minBarWidth = du(0.01); // Minimum bar width for visibility
            const volumeScalingFactor = 10; // Amplify small volumes for better visibility

            const askBarWidth = Math.max(du((askVol / maxAskVol) * 0.25 * volumeScalingFactor), minBarWidth);
            const bidBarWidth = Math.max(du((bidVol / maxBidVol) * 0.25 * volumeScalingFactor), minBarWidth);

            // Add stick candle
            if (price >= openPrice && price <= closePrice) {
                const stickCandleX = isCompactMode ? 
                    op(du(d.index()), '-', op(op(du(d.index() - 0.94), '-', du(this.prevIndex)), '/', px(2))) : 
                    op(du(d.index()), '-', op(op(du(d.index() - 0.97), '-', du(this.prevIndex)), '/', px(2)));
                const stickCandleWidth = isCompactMode ? du(0.06) : du(0.03);
                stickCandleContainer.primitives.push({
                    tag: 'Rectangle',
                    key: `stickCandle:${d.index()}${price}${Math.floor(Math.random())}`,
                    position: {
                        x: stickCandleX,
                        y: du(price + verticalGap - halfTickShift),
                    },
                    size: {
                        height: du(1 * this.contractInfo.tickSize * this.props.footprintTicksPerBar - verticalGap),
                        width: stickCandleWidth,
                    },
                });
            }

            // Ask Volume Bars
            const askXShift = isCompactMode ? 0.07 : 0.22;
            const askWidthFactor = isCompactMode ? 0.4 : 0.25;
            deltaBarsContainerPositive.primitives.push({
                tag: 'Rectangle',
                key: `askBar:${d.index()}${price}${Math.floor(Math.random())}`,
                position: {
                    x: op(du(d.index() - askXShift), '-', du(askBarWidth)),
                    y: du(price - this.contractInfo.tickSize * this.props.footprintTicksPerBar + verticalGap + halfTickShift),
                },
                size: {
                    height: du(1 * this.contractInfo.tickSize * this.props.footprintTicksPerBar - verticalGap),
                    width: du(askBarWidth),
                },
            });

            // Bid Volume Bars
            const bidXShift = isCompactMode ? -0.08 : -0.22;
            const bidWidthFactor = isCompactMode ? 0.4 : 0.25;
            bidBarContainerNegative.primitives.push({
                tag: 'Rectangle',
                key: `bidBar:${d.index()}${price}${Math.floor(Math.random())}`,
                position: {
                    x: du(d.index() - bidXShift),
                    y: du(price - this.contractInfo.tickSize * this.props.footprintTicksPerBar + verticalGap + halfTickShift),
                },
                size: {
                    height: du(1 * this.contractInfo.tickSize * this.props.footprintTicksPerBar - verticalGap),
                    width: du(bidBarWidth),
                },
            });

            // Ask Volume Text
            if (!this.props.hideDeltaText) {
                const askTextX = isCompactMode ? du(d.index() - 0.09) : du(d.index() - 0.05);
                deltaVolContainer.children.push({
                    tag: 'Text',
                    key: `askText:${d.index()}${price}`,
                    text: `${askVol}`,
                    point: {
                        x: askTextX,
                        y: du(price - this.contractInfo.tickSize * this.props.footprintTicksPerBar + this.contractInfo.tickSize * this.props.footprintTicksPerBar / 2 + halfTickShift),
                    },
                    style: {
                        fontSize: this.props.footprintFontSize,
                        fill: isCompactMode ? this.props.compactDeltaFontColor : this.props.dominantAskColor,
                    },
                    textAlignment: 'leftMiddle',
                });
            }

            // Bid Volume Text
            if (!this.props.hideTotalText) {
                const bidTextX = isCompactMode ? du(d.index() + 0.1) : du(d.index() + 0.05);
                totalVolContainer.children.push({
                    tag: 'Text',
                    key: `bidText:${d.index()}${price}`,
                    text: `${bidVol}`,
                    point: {
                        x: bidTextX,
                        y: du(price - this.contractInfo.tickSize * this.props.footprintTicksPerBar + this.contractInfo.tickSize * this.props.footprintTicksPerBar / 2 + halfTickShift),
                    },
                    style: {
                        fontSize: this.props.footprintFontSize,
                        fill: isCompactMode ? this.props.compactDeltaFontColor : this.props.dominantBidColor,
                    },
                    textAlignment: 'rightMiddle',
                });
            }
        });

        this.prevIndex = d.index();

        // New logic from DeltaDivergenceSignals
        let bearishDivergence = null;
        let bullishDivergence = null;
        let deltaText = null;

        const deltaValue = d.offerVolume() - d.bidVolume();
        const upCandleCheck = d.close() > d.open(); 
        const downCandleCheck = d.close() < d.open(); 

        const bullDiv = deltaValue < 0 && upCandleCheck;
        const bearDiv = deltaValue > 0 && downCandleCheck;

        const minDeltaFilter = this.props.filterMinDeltaAbsorption ? Math.abs(deltaValue) > this.props.filterMinAbsorption : true;

        if (bullDiv && minDeltaFilter) {
            bullishDivergence = d.low() - (this.contractInfo.tickSize * this.props.divergenceIconSpacing);
            deltaText = deltaValue.toFixed(0);
        }

        if (bearDiv && minDeltaFilter) {
            bearishDivergence = d.high() + (this.contractInfo.tickSize * this.props.divergenceIconSpacing);
            deltaText = deltaValue.toFixed(0);
        }

        const xOffset = 0.02;
        const fontSize = this.props.absorptionFontSize;

        const modifiedSizeAbove = this.contractInfo.tickSize * this.props.absorptionTextSpacing;
        const modifiedSizeBelow = this.contractInfo.tickSize * (this.props.absorptionTextSpacing + 1);
        
        const labelAnchor = bullishDivergence ? d.low() - modifiedSizeBelow : bearishDivergence ? d.high() + modifiedSizeAbove : d.close();
        const textColor = bullishDivergence ? this.props.sellingAbsorptionText : bearishDivergence ? this.props.buyingAbsorptionText : "#FFFFFF";
        
        const textPt = {
            x: op(du(d.index()),'-',du(xOffset)),
            y: du(labelAnchor)
        }

        const textContainer = {
            tag: "Container",
            key: "textContainer",
            children: [],
            conditions: {},
        };

        if ((bullishDivergence || bearishDivergence) && this.props.showDivergenceIcon) {
            textContainer.children.push({
                tag: "Text",
                key: `textKey${d.index()}`,
                text: deltaText || `${d.close()}`, 
                point: textPt,
                style: { fontSize, fill: textColor },
                textAlignment: "centerMiddle",
            });
        }

        // Only include containers if they are not hidden
        const items = [
            deltaBarsContainerPositive, 
            bidBarContainerNegative, 
            totalBarsContainer, 
            stickCandleContainer,
            ...itemsToRender  
        ];

        if (!this.props.hideDeltaText) items.push(deltaVolContainer);
        if (!this.props.hideTotalText) items.push(totalVolContainer);
        if (bullishDivergence || bearishDivergence) items.push(textContainer);

        return { 
            graphics: { items: items },
            bullishDivergence: bullishDivergence,
            bearishDivergence: bearishDivergence 
        };
    }
}

module.exports = {
    inputType: 'bars',
    name: "footprint_bid_ask",
    description: "MarketXero's footprint remake",
    calculator: barResDelta,
    params: {
        footprintGeneralSettings: predef.paramSpecs.enum({
            spacer: '-Choose-settings-below-------------------------------------------------------------------------------------------------------------'
        }, 'spacer'),
        footprintTicksPerBar: predef.paramSpecs.number(1, 1, 1),
        footprintScaleFactorPx: predef.paramSpecs.number(40, 5, 10),
        footprintFontSize: predef.paramSpecs.number(12, 1, 0),
        fontColor: predef.paramSpecs.color('#FFFFFF'),
        compactDeltaFontColor: predef.paramSpecs.color('#FFFFFF'),

        
        footprintColorsSettings: predef.paramSpecs.enum({
            spacer: '-Choose-settings-below-------------------------------------------------------------------------------------------------------------'
        }, 'spacer'),
        positiveCandleColor: predef.paramSpecs.color('#08F17D'),
        negativeCandleColor: predef.paramSpecs.color('#F5A623'),        
        deltaPositive: predef.paramSpecs.color('#30C7F6'),
        deltaNegative: predef.paramSpecs.color('#FD3232'),         
        totalVolumeColor: predef.paramSpecs.color('#9B9B9B'),
        zeroPrintTextColor: predef.paramSpecs.color('#FF00F4'),

        // New color parameters for bid/ask bars
        dominantAskColor: predef.paramSpecs.color('#FD3232'),  // Red for dominant Ask
        dominantBidColor: predef.paramSpecs.color('#08F17D'),  // Green for dominant Bid
        nonDominantColor: predef.paramSpecs.color('#9B9B9B'),  // Neutral color for non-dominant side

        compactModeAndHideTextSettings: predef.paramSpecs.enum({
            spacer: '-Choose-settings-below-------------------------------------------------------------------------------------------------------------'
        }, 'spacer'),
        compactMode: predef.paramSpecs.bool(false),
        hideDeltaText: predef.paramSpecs.bool(false),
        hideTotalText: predef.paramSpecs.bool(false),

        // Divergence signals
        absorptionAndDivergenceSettings: predef.paramSpecs.enum({
            spacer: '-Choose-settings-below-------------------------------------------------------------------------------------------------------------'
        }, 'spacer'),
        divergenceIconSpacing: predef.paramSpecs.number(2),
        absorptionTextSpacing: predef.paramSpecs.number(4),
        filterMinDeltaAbsorption: predef.paramSpecs.bool(false),
        filterMinAbsorption: predef.paramSpecs.number(0),
        showDivergenceIcon: predef.paramSpecs.bool(true),
        sellingAbsorptionText: predef.paramSpecs.color("#FD3232"),
        buyingAbsorptionText: predef.paramSpecs.color("#30C7F6"),
        absorptionFontSize: predef.paramSpecs.number(12),

        // Visibility
        pocAndValueAreaDisplay: predef.paramSpecs.enum({
            spacer: '-Choose-what to display-below-----------------------------------------------------------------------------------------------------'
        }, 'spacer'),
        pocAndValueAreaVisibility: predef.paramSpecs.enum({
            showAll: 'Show POC and Value High/Low',
            showPoc: 'Show POC only',
            shownone: 'Show none'
        }, 'showAll'),

        // POC Line Parameters 
        pocSettings: predef.paramSpecs.enum({
            spacer: '-Choose-settings-below-------------------------------------------------------------------------------------------------------------'
        }, 'spacer'),
        vpocColor: predef.paramSpecs.color('#F8E71C'),
        vpocOpacity: predef.paramSpecs.number(60, 10, 10),
        vpocThickness: predef.paramSpecs.number(3, 1, 1), 
        vpocWidth: predef.paramSpecs.number(0.5, 0.25, 0.25), 

        // Value Area Parameters
        valueAreaSettings: predef.paramSpecs.enum({
            spacer: '-Choose-settings-below-------------------------------------------------------------------------------------------------------------'
        }, 'spacer'),
        valueAreaPercentage: predef.paramSpecs.number(68, 1, 100), 
        valueAreaHighColor: predef.paramSpecs.color('#50E3C2'),
        valueAreaLowColor: predef.paramSpecs.color('#66A4EB'), 
        valueAreaOpacity: predef.paramSpecs.number(60, 10, 10),
        valueAreaThickness: predef.paramSpecs.number(3, 1, 1),
        valueAreaWidth: predef.paramSpecs.number(.5, 0.25, 0.25),

        // Bottom
        otherSettings: predef.paramSpecs.enum({
            spacer: '--------------------------------------------------------------------------------------------------------------------------------------------'
        }, 'spacer'),
    },

    tags: ["MarketXero"],
    schemeStyles: predef.styles.solidLine("#000"),
    requirements: {
        volumeProfiles: true,
    },
    plotter: [
        predef.plotters.dots('bearishDivergence'),
        predef.plotters.dots('bullishDivergence')
    ],
    plots: {
        bullishDivergence: { title: 'Bullish Divergence Icon', displayOnly: true },
        bearishDivergence: { title: 'Bearish Divergence Icon', displayOnly: true }
    },
    schemeStyles: {
        dark: {
            bullishDivergence: { color: "#08F17D" },
            bearishDivergence: { color: "#F5A623" }
        }
    }
}; 