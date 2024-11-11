const express = require('express');
const axios = require('axios');
const technicalindicators = require('technicalindicators');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());

// Fetch market data from Binance
const fetchBinanceData = async () => {
    try {
        const response = await axios.get('https://api.binance.com/api/v3/klines', {
            params: {
                symbol: 'LTCBTC',
                interval: '1h',   
                limit: 1000      
            }
        });
        
        return response.data.map(candle => ({
            timestamp: new Date(candle[0]),
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
        }));
    } catch (error) {
        console.error('Error fetching Binance data:', error);
        throw new Error('Failed to fetch Binance data');
    }
};

// Custom LSMA Calculation using Linear Regression
const calculateLSMA = (prices, window) => {
    const x = Array.from({ length: window }, (_, i) => i);
    const y = prices;
    
    const n = window;
    const sumX = x.reduce((acc, val) => acc + val, 0);
    const sumY = y.reduce((acc, val) => acc + val, 0);
    const sumXY = x.reduce((acc, val, idx) => acc + val * y[idx], 0);
    const sumX2 = x.reduce((acc, val) => acc + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return slope * (window - 1) + intercept;
};

// Calculate indicators (LSMA, TEMA, WMA)
const calculateIndicators = (data) => {
    const closePrices = data.map(d => d.close);
    const lsmaPeriod = 25;
    const temaPeriod = 9;
    const wmaPeriod = 9;

    const lsmaValues = [];
    for (let i = lsmaPeriod - 1; i < closePrices.length; i++) {
        const lsmaValue = calculateLSMA(closePrices.slice(i - lsmaPeriod + 1, i + 1), lsmaPeriod);
        lsmaValues.push(lsmaValue);
    }

    const temaValues = technicalindicators.ema({ values: closePrices, period: temaPeriod });
    const wmaValues = technicalindicators.wma({ values: closePrices, period: wmaPeriod });

    return {
        lsma: lsmaValues,
        tema: temaValues.slice(temaPeriod - 1),
        wma: wmaValues.slice(wmaPeriod - 1)
    };
};

// Trading logic to determine buy/sell points
const generateTradingSignals = (data, indicators) => {
    const signals = [];
    let buy = false;

    // Adjust loop to ensure we don't go out of bounds
    for (let i = 0; i < indicators.lsma.length; i++) {
        if (i + 25 >= data.length) {
            break; // Exit if we are close to the end of data
        }

        const currentLSMA = indicators.lsma[i];
        const currentTEMA = indicators.tema[i];
        const currentWMA = indicators.wma[i];

        // Buy logic: when TEMA > WMA > LSMA and we haven't bought yet
        if (currentTEMA > currentWMA && currentWMA > currentLSMA && !buy) {
            buy = true;
            signals.push({
                type: 'buy',
                price: data[i + 25].close,
                timestamp: data[i + 25].timestamp
            });
        }
        // Sell logic: when TEMA < WMA < LSMA and we have bought
        else if (currentTEMA < currentWMA && currentWMA < currentLSMA && buy) {
            buy = false;
            signals.push({
                type: 'sell',
                price: data[i + 25].close,
                timestamp: data[i + 25].timestamp
            });
        }
    }

    return signals;
};

// API endpoint to fetch data and calculate indicators
app.get('/api/market-data', async (req, res) => {
    try {
        const marketData = await fetchBinanceData();
        if (!marketData || marketData.length === 0) {
            return res.status(500).json({ error: 'No market data available' });
        }

        const indicators = calculateIndicators(marketData);
        const signals = generateTradingSignals(marketData, indicators);

        res.json({ marketData, indicators, signals });
    } catch (error) {
        console.error('Error in /api/market-data:', error.message);
        res.status(500).json({ error: 'Failed to fetch or process data' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
