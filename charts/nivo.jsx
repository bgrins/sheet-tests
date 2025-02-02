import React, { PureComponent } from "react";
import ReactDOM from "react-dom/client";
import * as d3 from "d3";

// install (please make sure versions match peerDependencies)
// yarn add @nivo/core @nivo/bar
import { Bar, BarCanvas } from "@nivo/bar";
import data from "./data/fastfood.json?inline";

// Slightly customized example from https://nivo.rocks/bar/
export const MyBar = ({
  data /* see data tab */,
  width,
  height,
  Component,
}) => (
  <Component
    data={data}
    keys={["hot dog", "burger", "sandwich", "kebab", "fries", "donut"]}
    indexBy="country"
    margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
    padding={0.3}
    valueScale={{ type: "linear" }}
    indexScale={{ type: "band", round: true }}
    colors={{ scheme: "nivo" }}
    borderColor={{
      from: "color",
      modifiers: [["darker", 1.6]],
    }}
    axisTop={null}
    axisRight={null}
    axisBottom={{
      tickSize: 5,
      tickPadding: 5,
      tickRotation: 0,
      legend: "country",
      legendPosition: "middle",
      legendOffset: 32,
    }}
    axisLeft={{
      tickSize: 5,
      tickPadding: 5,
      tickRotation: 0,
      legend: "food",
      legendPosition: "middle",
      legendOffset: -40,
    }}
    labelSkipWidth={12}
    labelSkipHeight={12}
    labelTextColor={{
      from: "color",
      modifiers: [["darker", 1.6]],
    }}
    legends={[
      {
        dataFrom: "keys",
        anchor: "bottom-right",
        direction: "column",
        justify: false,
        translateX: 120,
        translateY: 0,
        itemsSpacing: 2,
        itemWidth: 100,
        itemHeight: 20,
        itemDirection: "left-to-right",
        itemOpacity: 0.85,
        symbolSize: 20,
        effects: [
          {
            on: "hover",
            style: {
              itemOpacity: 1,
            },
          },
        ],
      },
    ]}
    role="application"
    ariaLabel="Nivo bar chart demo"
    barAriaLabel={function (e) {
      return e.id + ": " + e.formattedValue + " in country: " + e.indexValue;
    }}
    width={width}
    height={height}
    animate={false}
  />
);

function mount(container, element) {
  return new Promise((resolve) => {
    ReactDOM.createRoot(container).render(
      <div ref={() => resolve()}>{element}</div>
    );
  });
}

export function barSvg({ container, width, height }) {
  return mount(
    container,
    <MyBar data={data} width={width} height={height} Component={Bar} />
  );
}

export function barCanvas({ container, width, height }) {
  return mount(
    container,
    <MyBar data={data} width={width} height={height} Component={BarCanvas} />
  );
}

export function sameWithD3({ container, width, height }) {
  // Copyright 2021 Observable, Inc.
  // Released under the ISC license.
  // https://observablehq.com/@d3/stacked-bar-chart
  function StackedBarChart(
    data,
    {
      x = (d, i) => i, // given d in data, returns the (ordinal) x-value
      y = (d) => d, // given d in data, returns the (quantitative) y-value
      z = () => 1, // given d in data, returns the (categorical) z-value
      title, // given d in data, returns the title text
      marginTop = 30, // top margin, in pixels
      marginRight = 0, // right margin, in pixels
      marginBottom = 30, // bottom margin, in pixels
      marginLeft = 40, // left margin, in pixels
      width = 640, // outer width, in pixels
      height = 400, // outer height, in pixels
      xDomain, // array of x-values
      xRange = [marginLeft, width - marginRight], // [left, right]
      xPadding = 0.1, // amount of x-range to reserve to separate bars
      yType = d3.scaleLinear, // type of y-scale
      yDomain, // [ymin, ymax]
      yRange = [height - marginBottom, marginTop], // [bottom, top]
      zDomain, // array of z-values
      offset = d3.stackOffsetDiverging, // stack offset method
      order = d3.stackOrderNone, // stack order method
      yFormat, // a format specifier string for the y-axis
      yLabel, // a label for the y-axis
      colors = d3.schemeTableau10, // array of colors
    } = {}
  ) {
    // Compute values.
    const X = d3.map(data, x);
    const Y = d3.map(data, y);
    const Z = d3.map(data, z);

    // Compute default x- and z-domains, and unique them.
    if (xDomain === undefined) xDomain = X;
    if (zDomain === undefined) zDomain = Z;
    xDomain = new d3.InternSet(xDomain);
    zDomain = new d3.InternSet(zDomain);

    // Omit any data not present in the x- and z-domains.
    const I = d3
      .range(X.length)
      .filter((i) => xDomain.has(X[i]) && zDomain.has(Z[i]));

    // Compute a nested array of series where each series is [[y1, y2], [y1, y2],
    // [y1, y2], …] representing the y-extent of each stacked rect. In addition,
    // each tuple has an i (index) property so that we can refer back to the
    // original data point (data[i]). This code assumes that there is only one
    // data point for a given unique x- and z-value.
    const series = d3
      .stack()
      .keys(zDomain)
      .value(([x, I], z) => Y[I.get(z)])
      .order(order)
      .offset(offset)(
        d3.rollup(
          I,
          ([i]) => i,
          (i) => X[i],
          (i) => Z[i]
        )
      )
      .map((s) => s.map((d) => Object.assign(d, { i: d.data[1].get(s.key) })));

    // Compute the default y-domain. Note: diverging stacks can be negative.
    if (yDomain === undefined) yDomain = d3.extent(series.flat(2));

    // Construct scales, axes, and formats.
    const xScale = d3.scaleBand(xDomain, xRange).paddingInner(xPadding);
    const yScale = yType(yDomain, yRange);
    const color = d3.scaleOrdinal(zDomain, colors);
    const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);
    const yAxis = d3.axisLeft(yScale).ticks(height / 60, yFormat);

    // Compute titles.
    if (title === undefined) {
      const formatValue = yScale.tickFormat(100, yFormat);
      title = (i) => `${X[i]}\n${Z[i]}\n${formatValue(Y[i])}`;
    } else {
      const O = d3.map(data, (d) => d);
      const T = title;
      title = (i) => T(O[i], i, data);
    }

    const svg = d3
      .create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

    svg
      .append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(yAxis)
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .selectAll(".tick line")
          .clone()
          .attr("x2", width - marginLeft - marginRight)
          .attr("stroke-opacity", 0.1)
      )
      .call((g) =>
        g
          .append("text")
          .attr("x", -marginLeft)
          .attr("y", 10)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .text(yLabel)
      );

    const bar = svg
      .append("g")
      .selectAll("g")
      .data(series)
      .join("g")
      .attr("fill", ([{ i }]) => color(Z[i]))
      .selectAll("rect")
      .data((d) => d)
      .join("rect")
      .attr("x", ({ i }) => xScale(X[i]))
      .attr("y", ([y1, y2]) => Math.min(yScale(y1), yScale(y2)))
      .attr("height", ([y1, y2]) => Math.abs(yScale(y1) - yScale(y2)))
      .attr("width", xScale.bandwidth());

    if (title) bar.append("title").text(({ i }) => title(i));

    svg
      .append("g")
      .attr("transform", `translate(0,${yScale(0)})`)
      .call(xAxis);

    return Object.assign(svg.node(), { scales: { color } });
  }

  const keys = ["hot dog", "burger", "sandwich", "kebab", "fries", "donut"];
  const dataForD3 = [];
  for (const item of data) {
    for (const key of keys) {
      dataForD3.push({
        country: item.country,
        value: item[key],
        key,
      });
    }
  }

  container.append(
    StackedBarChart(dataForD3, {
      x: (d) => d.country,
      y: (d) => d.value,
      z: (d) => d.key,
      xDomain: data.map((item) => item.country),
      xLabel: "country",
      yLabel: "food",
      zDomain: keys,
      colors: d3.schemeSpectral[keys.length],
      width,
      height,
    })
  );
}
