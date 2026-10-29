// Stacked Imbalances (extend until revisited): a changed version of Latter-day
// Trader's "LDT - Stacked Imbalances (for New Charts)" (original header below).
// Changes: each imbalance box extends to the right until price trades back
// through it; box opacity is a setting; defaults 300% imbalance factor and
// pink sell boxes.

/**
 * Modified from the original indicator to plot correctly on new charts.
 * 
 * If you find this or any of my other indicators useful to your trading, 
 * please consider tipping me at buymeacoffee.com/latterdaytrader
 **/

const predef = require("./tools/predef");
const meta = require("./tools/meta");
const p = require("./tools/plotting");

const { px, du, op, min } = require("./tools/graphics");

class stackedImbalancesExtend {
    
    init() {
        this.rand = Math.floor(Math.random() * 2000);
        this.resolutionMinutes = 5;
        this.lastTimestamp = -1;
    }
    
    compare(a, b) {
        if (a.price > b.price) 
            return -1;
        
        if (b.price > a.price) 
            return 1;
        
        return 0;
    }
    
    getStackedImbalances(d, resolution)
    {
        const imbalanceFactor = this.props.imbalanceFactorPercent / 100.0;
        const stackedImbalanceSize = this.props.stackSize;
        let resultStackedImbalances = [];
        
        let buyImbalance = [];
        let sellImbalance = [];
    
        const p = d.profile();

        p.sort(this.compare);
        for(let i=0; i < (p.length-1); i++)
        {   
            if(p[i].askVol / imbalanceFactor > p[i+1].bidVol)
            {
                buyImbalance.push({price: p[i].price, volume: p[i].askVol});
            }
            else
            {
                if(buyImbalance.length >= stackedImbalanceSize)
                {
                    resultStackedImbalances.push({timestamp: d.timestamp(), milliseconds: d.timestamp().getTime(), type: 'buy', min: buyImbalance[buyImbalance.length - 1].price, max: buyImbalance[0].price});
                }
                buyImbalance = [];
            }
            
            if(p[i+1].bidVol / imbalanceFactor > p[i].askVol)
            {
                sellImbalance.push({price: p[i+1].price, volume: p[i+1].bidVol});
            }
            else
            {
                if(sellImbalance.length >= stackedImbalanceSize)
                {
                    resultStackedImbalances.push({timestamp: d.timestamp(), milliseconds: d.timestamp().getTime(), type: 'sell', min: sellImbalance[sellImbalance.length - 1].price, max: sellImbalance[0].price});
                }
                sellImbalance = [];
            }
        }
            
        if(sellImbalance.length >= stackedImbalanceSize)
        {
            resultStackedImbalances.push({timestamp: d.timestamp(), milliseconds: d.timestamp().getTime(), type: 'sell', min: sellImbalance[sellImbalance.length - 1].price, max: sellImbalance[0].price});
        }
        sellImbalance = [];
        
        if(buyImbalance.length >= stackedImbalanceSize)
        {
            resultStackedImbalances.push({timestamp: d.timestamp(), milliseconds: d.timestamp().getTime(), type: 'buy', min: buyImbalance[buyImbalance.length - 1].price, max: buyImbalance[0].price});
        }
        buyImbalance = [];
        
        return resultStackedImbalances;
    }
    
    map(d,index, history) {
        
        var stackedImbalances;
        
        if(this.resolutionMinutes > 0)
        {
            stackedImbalances = this.getStackedImbalances(d, this.resolutionMinutes);
        }
        else
        {
            if(this.lastTimestamp > 0)
            {
                this.resolutionMinutes = (d.timestamp().getTime() - this.lastTimestamp) / 60000;
            }
            else
            {
                this.lastTimestamp = d.timestamp().getTime();
            }
        }
        
        const xOffset = 0.5;
        const spacing = 1;
        let items = [];
        for (let i=0; i<stackedImbalances.length; i++) {
            
            const sb = stackedImbalances[i];
            const min = sb.min;
            const max = sb.max;
            
            // Find where price revisits the level
            let endIdx = history.size() - 1; // Default to extending to the last candle
            for (let k = index + 1; k < history.size(); k++) {
                const future = history.get(k);
                if (!future) continue;
                
                if (sb.type === 'buy' && future.low() < min) {
                    endIdx = k - 1; // Stop at the candle before intersection
                    break;
                }
                if (sb.type === 'sell' && future.high() > max) {
                    endIdx = k - 1; // Stop at the candle before intersection
                    break;
                }
            }
            
            const width = (endIdx - index) + 1; // Width in candles
            const color = sb.type === 'buy' ? this.props.buyImbalanceColor : this.props.sellImbalanceColor;
            
            const rect = {
                tag: "Shapes",
                key: 'imb:' + this.rand + ":" + index + ":" + i,
                primitives: [
                    {
                        tag: 'Rectangle',
                        position: {
                            x: du(d.index()),
                            y: du(min),
                        },
                        size: {
                            height: du(max - min),
                            width: du(width)
                        }
                    },
                ],
                fillStyle: {
                    color: color,
                    opacity: this.props.imbalanceOpacityPercent
                },
            };
            
            items.push(rect);
        }
           
        if (stackedImbalances && items.length > 0) {
            stackedImbalances["graphics"] = {items};
        }
            
        return stackedImbalances;
    }
}

module.exports = {
    name: "stackedImbalancesExtend",
    description: "Stacked Imbalances (LDT's fork)",
    calculator: stackedImbalancesExtend,
    tags: [predef.tags.Volumes, "Latter-day Trader"],
    inputType: meta.InputType.BARS,
    areaChoice: "overlay",
    params: {
        imbalanceFactorPercent: predef.paramSpecs.percent(300),
        stackSize: predef.paramSpecs.number(3),
        buyImbalanceColor: predef.paramSpecs.color("green"),
        sellImbalanceColor: predef.paramSpecs.color("pink"),
        imbalanceOpacityPercent: predef.paramSpecs.percent(50,1,1,100),
        imbalanceWidth: predef.paramSpecs.number(1)
    },
    //plots: {}
}; 