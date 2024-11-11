import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { format } from "d3-format";
import { timeFormat } from "d3-time-format";
import {
  elderRay,
  ema,
  wma,
  tma,
  sma,
  discontinuousTimeScaleProviderBuilder,
  Chart,
  ChartCanvas,
  CurrentCoordinate, 
  BarSeries,
  CandlestickSeries,
  ElderRaySeries,
  LineSeries,
  MovingAverageTooltip,
  OHLCTooltip,
  SingleValueTooltip,
  lastVisibleItemBasedZoomAnchor,
  XAxis,
  YAxis,
  CrossHairCursor,
  EdgeIndicator,
  MouseCoordinateX,
  MouseCoordinateY,
  ZoomButtons,
  withDeviceRatio,
  withSize
} from "react-financial-charts";
import { initialData } from "./data";

const FCChart = () => {

  const [tData, SetTData] = useState(initialData);

  useEffect=(()=>{
    initGetData();
  })

  const initGetData = async() => {
    axios.get('http://localhost:5000/api/market-data')
          .then(response => {
            const data = response.data;
            SetTData(data.marketData);
          })
          .catch(error => {
            if (error.response) {
              console.log('Server responded with a status:', error.response.status);
            } else if (error.request) {
              console.log('Request made but no response received:', error.request);
            } else {
              console.log('Error setting up request:', error.message);
            }
    })
  }

  const ScaleProvider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(
    (d) => new Date(d.date)
  );
  const height = 600;
  const width = 800;
  const margin = { left: 0, right: 0, top: 0, bottom: 0 };

  const ema26 = ema()
    .id(1)
    .options({ windowSize: 26 })
    .merge((d, c) => {
      d.ema26 = c;
    })
    .accessor((d) => d.ema26);

  const tma26 = tma()
    .id(2)
    .options({ windowSize: 26 })
    .merge((d, c) => {
      d.tma26  = c;
    })
    .accessor((d) => d.tma26);

  const wma26 = wma()
    .id(3)
    .options({ windowSize: 26 })
    .merge((d, c) => {
      d.wma26  = c;
    })
    .accessor((d) => d.wma26);

  const sma26 = sma()
    .id(4)
    .options({ windowSize: 26 })
    .merge((d, c) => {
      d.sma26  = c;
    })
    .accessor((d) => d.sma26);

  const elder = elderRay();

  const calculatedData = elder(ema26(tData));
  const calculatedTEMA = elder(tma26(tData));
  const calculatedSMA = elder(sma26(tData));
  const calculatedWMA = elder(wma26(tData));
  const { data, xScale, xAccessor, displayXAccessor } = ScaleProvider(
    tData
  );
  const pricesDisplayFormat = format(".2f");
  const max = xAccessor(data[data.length - 1]);
  const min = xAccessor(data[Math.max(0, data.length - 100)]);
  const xExtents = [min, max + 5];

  const gridHeight = height - margin.top - margin.bottom;

  const elderRayHeight = 100;
  const elderRayOrigin = (_, h) => [0, h - elderRayHeight];
  const barChartHeight = gridHeight / 4;
  const barChartOrigin = (_, h) => [0, h - barChartHeight - elderRayHeight];
  const chartHeight = gridHeight - elderRayHeight;
  const yExtents = (data) => {
    return [data.high, data.low];
  };
  const dateTimeFormat = "%d %b";
  const timeDisplayFormat = timeFormat(dateTimeFormat);

  const barChartExtents = (data) => {
    return data.volume;
  };

  const candleChartExtents = (data) => {
    return [data.high, data.low];
  };

  const yEdgeIndicator = (data) => {
    return data.close;
  };

  const volumeColor = (data) => {
    return data.close > data.open
      ? "rgba(38, 166, 154, 0.3)"
      : "rgba(239, 83, 80, 0.3)";
  };

  const volumeSeries = (data) => {
    return data.volume;
  };

  const openCloseColor = (data) => {
    return data.close > data.open ? "#26a69a" : "#ef5350";
  };
  

  return (
    <ChartCanvas
      height={height}
      ratio={3}
      width={width}
      margin={margin}
      data={data}
      displayXAccessor={displayXAccessor}
      seriesName="Data"
      xScale={xScale}
      xAccessor={xAccessor}
      xExtents={xExtents}
      zoomAnchor={lastVisibleItemBasedZoomAnchor}
    >
      <Chart
        id={2}
        height={barChartHeight}
        origin={barChartOrigin}
        yExtents={barChartExtents}
      >
        <BarSeries fillStyle={volumeColor} yAccessor={volumeSeries} />
      </Chart>
      <Chart id={3} height={chartHeight} yExtents={candleChartExtents}>

        <XAxis showGridLines showTickLabel={false} />
        <YAxis showGridLines tickFormat={pricesDisplayFormat} />

        {/* <CandlestickSeries /> */}

        <LineSeries yAccessor={ema26.accessor()} strokeStyle={ema26.stroke()} />
        <LineSeries yAccessor={wma26.accessor()} strokeStyle={wma26.stroke()} />
        <LineSeries yAccessor={tma26.accessor()} strokeStyle={tma26.stroke()} />
        <LineSeries yAccessor={sma26.accessor()} strokeStyle={sma26.stroke()} />

        {/* MouseCoordinateY: Displays the y-coordinate value when the mouse hovers over the chart.
        rectWidth={margin.right}: Sets the width of the rectangle displaying the coordinate. */}
        <MouseCoordinateY
          rectWidth={margin.right}
          displayFormat={pricesDisplayFormat}
        />
          {/* EdgeIndicator: Highlights the last data point on the y-axis. */}
        <EdgeIndicator 
          itemType="last"
          rectWidth={margin.right}
          fill={openCloseColor}
          lineStroke={openCloseColor}
          displayFormat={pricesDisplayFormat}
          yAccessor={yEdgeIndicator}
        />

        {/* ZoomButtons: A UI representation for users to zoom in and out on the chart data. */}
        <ZoomButtons /> 
        {/* OHLCTooltip: A tooltip that appears when the user hovers over candlestick data, displaying Open, High, Low, Close details. */}
        <OHLCTooltip origin={[8, 16]} />
      </Chart>
      {/* CrossHairCursor: Displays a crosshair cursor on the chart for better navigation and analysis of data points. */}
      <CrossHairCursor />
    </ChartCanvas>
  );
};

export default FCChart