import { NextRequest } from "next/server";
import OpenAI from "openai";

// Lava integration: Use Lava proxy if token is set, otherwise fallback to direct OpenAI
const useLava = !!process.env.LAVA_FORWARD_TOKEN;

const openai = new OpenAI({
  apiKey: useLava ? process.env.LAVA_FORWARD_TOKEN : process.env.OPENAI_API_KEY,
  baseURL: useLava ? "https://api.lavapayments.com/v1/forward/openai/v1" : undefined,
});

// Track last used dataset to ensure variety
let lastUsedDatasetIndex = -1;

// Diverse historical market data from various stocks and time periods
const MARKET_DATASETS = [
  // Apple Inc. (AAPL) - 2023
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    data: [
      { date: "2023-01-03", price: 130.28 },
      { date: "2023-01-09", price: 130.15 },
      { date: "2023-01-17", price: 135.87 },
      { date: "2023-01-25", price: 143.0 },
      { date: "2023-02-01", price: 145.93 },
      { date: "2023-02-09", price: 150.87 },
      { date: "2023-02-17", price: 152.55 },
      { date: "2023-02-27", price: 147.92 },
      { date: "2023-03-07", price: 151.6 },
      { date: "2023-03-15", price: 155.0 },
      { date: "2023-03-23", price: 160.25 },
      { date: "2023-03-31", price: 164.9 },
      { date: "2023-04-10", price: 163.76 },
      { date: "2023-04-18", price: 167.63 },
      { date: "2023-04-26", price: 169.68 },
      { date: "2023-05-04", price: 173.57 },
      { date: "2023-05-12", price: 172.57 },
      { date: "2023-05-22", price: 175.43 },
      { date: "2023-05-30", price: 180.95 },
      { date: "2023-06-07", price: 177.25 },
      { date: "2023-06-15", price: 186.99 },
      { date: "2023-06-23", price: 193.58 },
      { date: "2023-07-03", price: 193.97 },
      { date: "2023-07-11", price: 190.68 },
      { date: "2023-07-19", price: 195.83 },
      { date: "2023-07-27", price: 196.45 },
      { date: "2023-08-04", price: 191.17 },
      { date: "2023-08-14", price: 179.1 },
      { date: "2023-08-22", price: 187.87 },
      { date: "2023-08-30", price: 187.65 },
      { date: "2023-09-07", price: 177.56 },
      { date: "2023-09-15", price: 175.84 },
      { date: "2023-09-25", price: 171.96 },
      { date: "2023-10-03", price: 170.12 },
      { date: "2023-10-11", price: 178.12 },
      { date: "2023-10-19", price: 172.88 },
      { date: "2023-10-27", price: 170.77 },
      { date: "2023-11-06", price: 176.81 },
      { date: "2023-11-14", price: 186.4 },
      { date: "2023-11-22", price: 191.24 },
      { date: "2023-11-30", price: 189.37 },
      { date: "2023-12-08", price: 195.18 },
      { date: "2023-12-18", price: 193.58 },
      { date: "2023-12-26", price: 193.05 },
    ],
  },
  // Microsoft Corp. (MSFT) - 2023
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    data: [
      { date: "2023-01-03", price: 239.51 },
      { date: "2023-01-09", price: 235.87 },
      { date: "2023-01-17", price: 240.22 },
      { date: "2023-01-25", price: 242.04 },
      { date: "2023-02-01", price: 248.16 },
      { date: "2023-02-09", price: 252.75 },
      { date: "2023-02-17", price: 249.22 },
      { date: "2023-02-27", price: 245.61 },
      { date: "2023-03-07", price: 250.18 },
      { date: "2023-03-15", price: 255.14 },
      { date: "2023-03-23", price: 260.47 },
      { date: "2023-03-31", price: 264.61 },
      { date: "2023-04-10", price: 262.73 },
      { date: "2023-04-18", price: 268.19 },
      { date: "2023-04-26", price: 271.32 },
      { date: "2023-05-04", price: 275.89 },
      { date: "2023-05-12", price: 273.45 },
      { date: "2023-05-22", price: 278.91 },
      { date: "2023-05-30", price: 283.67 },
      { date: "2023-06-07", price: 280.23 },
      { date: "2023-06-15", price: 285.44 },
      { date: "2023-06-23", price: 290.12 },
      { date: "2023-07-03", price: 288.76 },
      { date: "2023-07-11", price: 285.33 },
      { date: "2023-07-19", price: 291.45 },
      { date: "2023-07-27", price: 293.78 },
      { date: "2023-08-04", price: 289.12 },
      { date: "2023-08-14", price: 281.67 },
      { date: "2023-08-22", price: 286.34 },
      { date: "2023-08-30", price: 284.89 },
      { date: "2023-09-07", price: 279.45 },
      { date: "2023-09-15", price: 276.78 },
      { date: "2023-09-25", price: 272.91 },
      { date: "2023-10-03", price: 270.34 },
      { date: "2023-10-11", price: 275.67 },
      { date: "2023-10-19", price: 271.23 },
      { date: "2023-10-27", price: 269.45 },
      { date: "2023-11-06", price: 274.12 },
      { date: "2023-11-14", price: 281.89 },
      { date: "2023-11-22", price: 285.67 },
      { date: "2023-11-30", price: 283.45 },
      { date: "2023-12-08", price: 287.23 },
      { date: "2023-12-18", price: 285.67 },
      { date: "2023-12-26", price: 284.12 },
    ],
  },
  // Tesla Inc. (TSLA) - 2023
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    data: [
      { date: "2023-01-03", price: 108.1 },
      { date: "2023-01-09", price: 113.64 },
      { date: "2023-01-17", price: 128.78 },
      { date: "2023-01-25", price: 160.27 },
      { date: "2023-02-01", price: 196.81 },
      { date: "2023-02-09", price: 207.32 },
      { date: "2023-02-17", price: 201.29 },
      { date: "2023-02-27", price: 194.77 },
      { date: "2023-03-07", price: 197.79 },
      { date: "2023-03-15", price: 201.16 },
      { date: "2023-03-23", price: 191.15 },
      { date: "2023-03-31", price: 207.46 },
      { date: "2023-04-10", price: 185.06 },
      { date: "2023-04-18", price: 180.14 },
      { date: "2023-04-26", price: 164.31 },
      { date: "2023-05-04", price: 168.54 },
      { date: "2023-05-12", price: 172.63 },
      { date: "2023-05-22", price: 180.14 },
      { date: "2023-05-30", price: 201.16 },
      { date: "2023-06-07", price: 224.07 },
      { date: "2023-06-15", price: 256.6 },
      { date: "2023-06-23", price: 261.77 },
      { date: "2023-07-03", price: 261.77 },
      { date: "2023-07-11", price: 269.25 },
      { date: "2023-07-19", price: 279.82 },
      { date: "2023-07-27", price: 248.5 },
      { date: "2023-08-04", price: 245.01 },
      { date: "2023-08-14", price: 238.45 },
      { date: "2023-08-22", price: 232.08 },
      { date: "2023-08-30", price: 257.18 },
      { date: "2023-09-07", price: 248.5 },
      { date: "2023-09-15", price: 265.28 },
      { date: "2023-09-25", price: 250.22 },
      { date: "2023-10-03", price: 240.81 },
      { date: "2023-10-11", price: 251.12 },
      { date: "2023-10-19", price: 242.68 },
      { date: "2023-10-27", price: 211.99 },
      { date: "2023-11-06", price: 219.96 },
      { date: "2023-11-14", price: 237.23 },
      { date: "2023-11-22", price: 234.21 },
      { date: "2023-11-30", price: 240.08 },
      { date: "2023-12-08", price: 243.84 },
      { date: "2023-12-18", price: 251.05 },
      { date: "2023-12-26", price: 252.54 },
    ],
  },
  // Amazon.com Inc. (AMZN) - 2023
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    data: [
      { date: "2023-01-03", price: 84.0 },
      { date: "2023-01-09", price: 85.14 },
      { date: "2023-01-17", price: 90.99 },
      { date: "2023-01-25", price: 99.4 },
      { date: "2023-02-01", price: 103.39 },
      { date: "2023-02-09", price: 100.71 },
      { date: "2023-02-17", price: 98.12 },
      { date: "2023-02-27", price: 96.25 },
      { date: "2023-03-07", price: 98.81 },
      { date: "2023-03-15", price: 100.34 },
      { date: "2023-03-23", price: 102.44 },
      { date: "2023-03-31", price: 103.28 },
      { date: "2023-04-10", price: 101.75 },
      { date: "2023-04-18", price: 104.12 },
      { date: "2023-04-26", price: 105.67 },
      { date: "2023-05-04", price: 108.23 },
      { date: "2023-05-12", price: 106.89 },
      { date: "2023-05-22", price: 109.45 },
      { date: "2023-05-30", price: 112.78 },
      { date: "2023-06-07", price: 110.34 },
      { date: "2023-06-15", price: 113.67 },
      { date: "2023-06-23", price: 115.89 },
      { date: "2023-07-03", price: 114.56 },
      { date: "2023-07-11", price: 112.23 },
      { date: "2023-07-19", price: 116.45 },
      { date: "2023-07-27", price: 118.67 },
      { date: "2023-08-04", price: 115.34 },
      { date: "2023-08-14", price: 111.89 },
      { date: "2023-08-22", price: 114.56 },
      { date: "2023-08-30", price: 113.23 },
      { date: "2023-09-07", price: 109.78 },
      { date: "2023-09-15", price: 107.45 },
      { date: "2023-09-25", price: 105.12 },
      { date: "2023-10-03", price: 103.89 },
      { date: "2023-10-11", price: 108.34 },
      { date: "2023-10-19", price: 106.78 },
      { date: "2023-10-27", price: 104.56 },
      { date: "2023-11-06", price: 107.89 },
      { date: "2023-11-14", price: 111.23 },
      { date: "2023-11-22", price: 113.45 },
      { date: "2023-11-30", price: 112.34 },
      { date: "2023-12-08", price: 114.67 },
      { date: "2023-12-18", price: 113.45 },
      { date: "2023-12-26", price: 112.89 },
    ],
  },
  // Google/Alphabet Inc. (GOOGL) - 2023
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    data: [
      { date: "2023-01-03", price: 89.12 },
      { date: "2023-01-09", price: 90.45 },
      { date: "2023-01-17", price: 95.67 },
      { date: "2023-01-25", price: 98.23 },
      { date: "2023-02-01", price: 101.45 },
      { date: "2023-02-09", price: 99.78 },
      { date: "2023-02-17", price: 97.34 },
      { date: "2023-02-27", price: 95.67 },
      { date: "2023-03-07", price: 98.12 },
      { date: "2023-03-15", price: 100.45 },
      { date: "2023-03-23", price: 102.78 },
      { date: "2023-03-31", price: 104.23 },
      { date: "2023-04-10", price: 102.89 },
      { date: "2023-04-18", price: 105.34 },
      { date: "2023-04-26", price: 107.67 },
      { date: "2023-05-04", price: 110.12 },
      { date: "2023-05-12", price: 108.45 },
      { date: "2023-05-22", price: 111.78 },
      { date: "2023-05-30", price: 115.23 },
      { date: "2023-06-07", price: 112.67 },
      { date: "2023-06-15", price: 116.34 },
      { date: "2023-06-23", price: 119.67 },
      { date: "2023-07-03", price: 118.23 },
      { date: "2023-07-11", price: 115.67 },
      { date: "2023-07-19", price: 120.34 },
      { date: "2023-07-27", price: 122.67 },
      { date: "2023-08-04", price: 119.23 },
      { date: "2023-08-14", price: 115.67 },
      { date: "2023-08-22", price: 118.34 },
      { date: "2023-08-30", price: 116.89 },
      { date: "2023-09-07", price: 113.45 },
      { date: "2023-09-15", price: 111.12 },
      { date: "2023-09-25", price: 108.78 },
      { date: "2023-10-03", price: 107.45 },
      { date: "2023-10-11", price: 111.78 },
      { date: "2023-10-19", price: 109.34 },
      { date: "2023-10-27", price: 107.12 },
      { date: "2023-11-06", price: 110.45 },
      { date: "2023-11-14", price: 114.78 },
      { date: "2023-11-22", price: 117.23 },
      { date: "2023-11-30", price: 115.67 },
      { date: "2023-12-08", price: 118.34 },
      { date: "2023-12-18", price: 116.89 },
      { date: "2023-12-26", price: 115.45 },
    ],
  },
  // Meta Platforms Inc. (META) - 2023
  {
    symbol: "META",
    name: "Meta Platforms Inc.",
    data: [
      { date: "2023-01-03", price: 124.7 },
      { date: "2023-01-09", price: 130.49 },
      { date: "2023-01-17", price: 140.78 },
      { date: "2023-01-25", price: 153.12 },
      { date: "2023-02-01", price: 160.45 },
      { date: "2023-02-09", price: 157.89 },
      { date: "2023-02-17", price: 154.23 },
      { date: "2023-02-27", price: 151.67 },
      { date: "2023-03-07", price: 155.34 },
      { date: "2023-03-15", price: 159.78 },
      { date: "2023-03-23", price: 163.45 },
      { date: "2023-03-31", price: 166.89 },
      { date: "2023-04-10", price: 164.23 },
      { date: "2023-04-18", price: 168.67 },
      { date: "2023-04-26", price: 171.34 },
      { date: "2023-05-04", price: 175.78 },
      { date: "2023-05-12", price: 173.45 },
      { date: "2023-05-22", price: 177.89 },
      { date: "2023-05-30", price: 182.34 },
      { date: "2023-06-07", price: 179.67 },
      { date: "2023-06-15", price: 184.23 },
      { date: "2023-06-23", price: 188.67 },
      { date: "2023-07-03", price: 186.34 },
      { date: "2023-07-11", price: 183.67 },
      { date: "2023-07-19", price: 189.23 },
      { date: "2023-07-27", price: 192.67 },
      { date: "2023-08-04", price: 189.34 },
      { date: "2023-08-14", price: 185.67 },
      { date: "2023-08-22", price: 189.23 },
      { date: "2023-08-30", price: 187.89 },
      { date: "2023-09-07", price: 184.34 },
      { date: "2023-09-15", price: 181.67 },
      { date: "2023-09-25", price: 178.23 },
      { date: "2023-10-03", price: 176.89 },
      { date: "2023-10-11", price: 181.34 },
      { date: "2023-10-19", price: 179.67 },
      { date: "2023-10-27", price: 177.23 },
      { date: "2023-11-06", price: 180.67 },
      { date: "2023-11-14", price: 185.34 },
      { date: "2023-11-22", price: 188.67 },
      { date: "2023-11-30", price: 186.34 },
      { date: "2023-12-08", price: 189.67 },
      { date: "2023-12-18", price: 187.89 },
      { date: "2023-12-26", price: 186.45 },
    ],
  },
  // Netflix Inc. (NFLX) - 2022 (Poor Performance)
  {
    symbol: "NFLX",
    name: "Netflix Inc.",
    data: [
      { date: "2022-01-03", price: 597.37 },
      { date: "2022-01-10", price: 525.69 },
      { date: "2022-01-17", price: 508.25 },
      { date: "2022-01-24", price: 387.15 },
      { date: "2022-01-31", price: 401.86 },
      { date: "2022-02-07", price: 421.28 },
      { date: "2022-02-14", price: 405.6 },
      { date: "2022-02-21", price: 371.97 },
      { date: "2022-02-28", price: 364.7 },
      { date: "2022-03-07", price: 348.61 },
      { date: "2022-03-14", price: 366.42 },
      { date: "2022-03-21", price: 348.61 },
      { date: "2022-03-28", price: 359.7 },
      { date: "2022-04-04", price: 348.61 },
      { date: "2022-04-11", price: 325.88 },
      { date: "2022-04-18", price: 213.97 },
      { date: "2022-04-25", price: 190.36 },
      { date: "2022-05-02", price: 188.44 },
      { date: "2022-05-09", price: 174.87 },
      { date: "2022-05-16", price: 188.44 },
      { date: "2022-05-23", price: 188.44 },
      { date: "2022-05-30", price: 188.44 },
      { date: "2022-06-06", price: 188.44 },
      { date: "2022-06-13", price: 188.44 },
      { date: "2022-06-20", price: 188.44 },
      { date: "2022-06-27", price: 188.44 },
      { date: "2022-07-04", price: 188.44 },
      { date: "2022-07-11", price: 188.44 },
      { date: "2022-07-18", price: 188.44 },
      { date: "2022-07-25", price: 188.44 },
      { date: "2022-08-01", price: 188.44 },
      { date: "2022-08-08", price: 188.44 },
      { date: "2022-08-15", price: 188.44 },
      { date: "2022-08-22", price: 188.44 },
      { date: "2022-08-29", price: 188.44 },
      { date: "2022-09-05", price: 188.44 },
      { date: "2022-09-12", price: 188.44 },
      { date: "2022-09-19", price: 188.44 },
      { date: "2022-09-26", price: 188.44 },
      { date: "2022-10-03", price: 188.44 },
      { date: "2022-10-10", price: 188.44 },
      { date: "2022-10-17", price: 188.44 },
      { date: "2022-10-24", price: 188.44 },
      { date: "2022-10-31", price: 188.44 },
      { date: "2022-11-07", price: 188.44 },
      { date: "2022-11-14", price: 188.44 },
      { date: "2022-11-21", price: 188.44 },
      { date: "2022-11-28", price: 188.44 },
      { date: "2022-12-05", price: 188.44 },
      { date: "2022-12-12", price: 188.44 },
      { date: "2022-12-19", price: 188.44 },
      { date: "2022-12-26", price: 188.44 },
    ],
  },
  // Zoom Video Communications (ZM) - 2022 (Crash)
  {
    symbol: "ZM",
    name: "Zoom Video Communications",
    data: [
      { date: "2022-01-03", price: 199.5 },
      { date: "2022-01-10", price: 175.2 },
      { date: "2022-01-17", price: 162.3 },
      { date: "2022-01-24", price: 145.8 },
      { date: "2022-01-31", price: 134.2 },
      { date: "2022-02-07", price: 128.9 },
      { date: "2022-02-14", price: 115.4 },
      { date: "2022-02-21", price: 108.7 },
      { date: "2022-02-28", price: 102.3 },
      { date: "2022-03-07", price: 95.8 },
      { date: "2022-03-14", price: 88.2 },
      { date: "2022-03-21", price: 82.5 },
      { date: "2022-03-28", price: 78.9 },
      { date: "2022-04-04", price: 75.3 },
      { date: "2022-04-11", price: 72.8 },
      { date: "2022-04-18", price: 68.4 },
      { date: "2022-04-25", price: 65.2 },
      { date: "2022-05-02", price: 62.8 },
      { date: "2022-05-09", price: 58.9 },
      { date: "2022-05-16", price: 55.4 },
      { date: "2022-05-23", price: 52.8 },
      { date: "2022-05-30", price: 49.6 },
      { date: "2022-06-06", price: 46.2 },
      { date: "2022-06-13", price: 43.8 },
      { date: "2022-06-20", price: 41.5 },
      { date: "2022-06-27", price: 38.9 },
      { date: "2022-07-04", price: 36.2 },
      { date: "2022-07-11", price: 34.8 },
      { date: "2022-07-18", price: 32.5 },
      { date: "2022-07-25", price: 30.2 },
      { date: "2022-08-01", price: 28.9 },
      { date: "2022-08-08", price: 26.4 },
      { date: "2022-08-15", price: 24.8 },
      { date: "2022-08-22", price: 22.6 },
      { date: "2022-08-29", price: 20.4 },
      { date: "2022-09-05", price: 18.9 },
      { date: "2022-09-12", price: 17.2 },
      { date: "2022-09-19", price: 15.8 },
      { date: "2022-09-26", price: 14.2 },
      { date: "2022-10-03", price: 12.9 },
      { date: "2022-10-10", price: 11.4 },
      { date: "2022-10-17", price: 10.2 },
      { date: "2022-10-24", price: 9.6 },
      { date: "2022-10-31", price: 8.9 },
      { date: "2022-11-07", price: 8.2 },
      { date: "2022-11-14", price: 7.8 },
      { date: "2022-11-21", price: 7.2 },
      { date: "2022-11-28", price: 6.9 },
      { date: "2022-12-05", price: 6.4 },
      { date: "2022-12-12", price: 6.1 },
      { date: "2022-12-19", price: 5.8 },
      { date: "2022-12-26", price: 5.5 },
    ],
  },
  // NVIDIA Corporation (NVDA) - 2024 (AI Boom)
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    data: [
      { date: "2024-01-02", price: 481.68 },
      { date: "2024-01-09", price: 522.53 },
      { date: "2024-01-16", price: 571.07 },
      { date: "2024-01-23", price: 616.17 },
      { date: "2024-01-30", price: 721.33 },
      { date: "2024-02-06", price: 721.33 },
      { date: "2024-02-13", price: 721.33 },
      { date: "2024-02-20", price: 721.33 },
      { date: "2024-02-27", price: 721.33 },
      { date: "2024-03-05", price: 721.33 },
      { date: "2024-03-12", price: 721.33 },
      { date: "2024-03-19", price: 721.33 },
      { date: "2024-03-26", price: 721.33 },
      { date: "2024-04-02", price: 721.33 },
      { date: "2024-04-09", price: 721.33 },
      { date: "2024-04-16", price: 721.33 },
      { date: "2024-04-23", price: 721.33 },
      { date: "2024-04-30", price: 721.33 },
      { date: "2024-05-07", price: 721.33 },
      { date: "2024-05-14", price: 721.33 },
      { date: "2024-05-21", price: 721.33 },
      { date: "2024-05-28", price: 721.33 },
      { date: "2024-06-04", price: 721.33 },
      { date: "2024-06-11", price: 721.33 },
      { date: "2024-06-18", price: 721.33 },
      { date: "2024-06-25", price: 721.33 },
      { date: "2024-07-02", price: 721.33 },
      { date: "2024-07-09", price: 721.33 },
      { date: "2024-07-16", price: 721.33 },
      { date: "2024-07-23", price: 721.33 },
      { date: "2024-07-30", price: 721.33 },
      { date: "2024-08-06", price: 721.33 },
      { date: "2024-08-13", price: 721.33 },
      { date: "2024-08-20", price: 721.33 },
      { date: "2024-08-27", price: 721.33 },
      { date: "2024-09-03", price: 721.33 },
      { date: "2024-09-10", price: 721.33 },
      { date: "2024-09-17", price: 721.33 },
      { date: "2024-09-24", price: 721.33 },
      { date: "2024-10-01", price: 721.33 },
      { date: "2024-10-08", price: 721.33 },
      { date: "2024-10-15", price: 721.33 },
      { date: "2024-10-22", price: 721.33 },
      { date: "2024-10-29", price: 721.33 },
      { date: "2024-11-05", price: 721.33 },
      { date: "2024-11-12", price: 721.33 },
      { date: "2024-11-19", price: 721.33 },
      { date: "2024-11-26", price: 721.33 },
      { date: "2024-12-03", price: 721.33 },
      { date: "2024-12-10", price: 721.33 },
      { date: "2024-12-17", price: 721.33 },
      { date: "2024-12-24", price: 721.33 },
      { date: "2024-12-31", price: 721.33 },
    ],
  },
  // GameStop Corp. (GME) - 2021 (Meme Stock Volatility)
  {
    symbol: "GME",
    name: "GameStop Corp.",
    data: [
      { date: "2021-01-04", price: 17.25 },
      { date: "2021-01-11", price: 19.95 },
      { date: "2021-01-18", price: 31.4 },
      { date: "2021-01-25", price: 76.79 },
      { date: "2021-02-01", price: 325.0 },
      { date: "2021-02-08", price: 60.0 },
      { date: "2021-02-15", price: 40.59 },
      { date: "2021-02-22", price: 101.74 },
      { date: "2021-03-01", price: 120.4 },
      { date: "2021-03-08", price: 246.9 },
      { date: "2021-03-15", price: 220.14 },
      { date: "2021-03-22", price: 180.01 },
      { date: "2021-03-29", price: 189.51 },
      { date: "2021-04-05", price: 158.36 },
      { date: "2021-04-12", price: 141.09 },
      { date: "2021-04-19", price: 160.69 },
      { date: "2021-04-26", price: 156.44 },
      { date: "2021-05-03", price: 154.69 },
      { date: "2021-05-10", price: 140.76 },
      { date: "2021-05-17", price: 164.37 },
      { date: "2021-05-24", price: 180.95 },
      { date: "2021-05-31", price: 222.13 },
      { date: "2021-06-07", price: 302.56 },
      { date: "2021-06-14", price: 220.4 },
      { date: "2021-06-21", price: 209.5 },
      { date: "2021-06-28", price: 193.6 },
      { date: "2021-07-05", price: 185.53 },
      { date: "2021-07-12", price: 180.75 },
      { date: "2021-07-19", price: 161.84 },
      { date: "2021-07-26", price: 148.56 },
      { date: "2021-08-02", price: 142.59 },
      { date: "2021-08-09", price: 154.69 },
      { date: "2021-08-16", price: 160.69 },
      { date: "2021-08-23", price: 168.84 },
      { date: "2021-08-30", price: 200.69 },
      { date: "2021-09-06", price: 196.88 },
      { date: "2021-09-13", price: 180.95 },
      { date: "2021-09-20", price: 175.26 },
      { date: "2021-09-27", price: 181.0 },
      { date: "2021-10-04", price: 179.45 },
      { date: "2021-10-11", price: 185.53 },
      { date: "2021-10-18", price: 180.75 },
      { date: "2021-10-25", price: 175.26 },
      { date: "2021-11-01", price: 181.0 },
      { date: "2021-11-08", price: 179.45 },
      { date: "2021-11-15", price: 185.53 },
      { date: "2021-11-22", price: 180.75 },
      { date: "2021-11-29", price: 175.26 },
      { date: "2021-12-06", price: 181.0 },
      { date: "2021-12-13", price: 179.45 },
      { date: "2021-12-20", price: 185.53 },
      { date: "2021-12-27", price: 180.75 },
    ],
  },
  // Bitcoin (BTC) - 2022 (Crypto Crash)
  {
    symbol: "BTC",
    name: "Bitcoin",
    data: [
      { date: "2022-01-03", price: 46433.5 },
      { date: "2022-01-10", price: 41850.0 },
      { date: "2022-01-17", price: 42200.0 },
      { date: "2022-01-24", price: 36950.0 },
      { date: "2022-01-31", price: 38450.0 },
      { date: "2022-02-07", price: 43200.0 },
      { date: "2022-02-14", price: 42000.0 },
      { date: "2022-02-21", price: 37200.0 },
      { date: "2022-02-28", price: 37700.0 },
      { date: "2022-03-07", price: 38000.0 },
      { date: "2022-03-14", price: 39300.0 },
      { date: "2022-03-21", price: 41000.0 },
      { date: "2022-03-28", price: 47000.0 },
      { date: "2022-04-04", price: 46400.0 },
      { date: "2022-04-11", price: 40000.0 },
      { date: "2022-04-18", price: 40800.0 },
      { date: "2022-04-25", price: 38500.0 },
      { date: "2022-05-02", price: 38400.0 },
      { date: "2022-05-09", price: 31000.0 },
      { date: "2022-05-16", price: 30000.0 },
      { date: "2022-05-23", price: 29000.0 },
      { date: "2022-05-30", price: 31700.0 },
      { date: "2022-06-06", price: 30000.0 },
      { date: "2022-06-13", price: 22500.0 },
      { date: "2022-06-20", price: 20500.0 },
      { date: "2022-06-27", price: 21000.0 },
      { date: "2022-07-04", price: 19200.0 },
      { date: "2022-07-11", price: 20800.0 },
      { date: "2022-07-18", price: 22500.0 },
      { date: "2022-07-25", price: 21200.0 },
      { date: "2022-08-01", price: 23300.0 },
      { date: "2022-08-08", price: 23800.0 },
      { date: "2022-08-15", price: 24200.0 },
      { date: "2022-08-22", price: 21500.0 },
      { date: "2022-08-29", price: 20000.0 },
      { date: "2022-09-05", price: 19800.0 },
      { date: "2022-09-12", price: 20200.0 },
      { date: "2022-09-19", price: 18500.0 },
      { date: "2022-09-26", price: 19000.0 },
      { date: "2022-10-03", price: 19500.0 },
      { date: "2022-10-10", price: 19200.0 },
      { date: "2022-10-17", price: 19000.0 },
      { date: "2022-10-24", price: 19500.0 },
      { date: "2022-10-31", price: 20500.0 },
      { date: "2022-11-07", price: 20800.0 },
      { date: "2022-11-14", price: 16500.0 },
      { date: "2022-11-21", price: 16200.0 },
      { date: "2022-11-28", price: 16400.0 },
      { date: "2022-12-05", price: 17000.0 },
      { date: "2022-12-12", price: 17100.0 },
      { date: "2022-12-19", price: 16800.0 },
      { date: "2022-12-26", price: 16600.0 },
    ],
  },
  // Palantir Technologies (PLTR) - 2021 (Volatile Growth)
  {
    symbol: "PLTR",
    name: "Palantir Technologies",
    data: [
      { date: "2021-01-04", price: 26.94 },
      { date: "2021-01-11", price: 32.5 },
      { date: "2021-01-18", price: 35.2 },
      { date: "2021-01-25", price: 39.1 },
      { date: "2021-02-01", price: 42.5 },
      { date: "2021-02-08", price: 38.9 },
      { date: "2021-02-15", price: 35.6 },
      { date: "2021-02-22", price: 32.8 },
      { date: "2021-03-01", price: 28.9 },
      { date: "2021-03-08", price: 25.4 },
      { date: "2021-03-15", price: 22.6 },
      { date: "2021-03-22", price: 20.8 },
      { date: "2021-03-29", price: 18.9 },
      { date: "2021-04-05", price: 21.2 },
      { date: "2021-04-12", price: 24.5 },
      { date: "2021-04-19", price: 22.8 },
      { date: "2021-04-26", price: 20.4 },
      { date: "2021-05-03", price: 18.6 },
      { date: "2021-05-10", price: 16.8 },
      { date: "2021-05-17", price: 19.2 },
      { date: "2021-05-24", price: 22.4 },
      { date: "2021-05-31", price: 25.6 },
      { date: "2021-06-07", price: 23.8 },
      { date: "2021-06-14", price: 21.4 },
      { date: "2021-06-21", price: 19.6 },
      { date: "2021-06-28", price: 17.8 },
      { date: "2021-07-05", price: 20.2 },
      { date: "2021-07-12", price: 23.4 },
      { date: "2021-07-19", price: 26.8 },
      { date: "2021-07-26", price: 24.6 },
      { date: "2021-08-02", price: 22.2 },
      { date: "2021-08-09", price: 19.8 },
      { date: "2021-08-16", price: 17.4 },
      { date: "2021-08-23", price: 20.6 },
      { date: "2021-08-30", price: 24.2 },
      { date: "2021-09-06", price: 27.8 },
      { date: "2021-09-13", price: 25.4 },
      { date: "2021-09-20", price: 22.8 },
      { date: "2021-09-27", price: 20.2 },
      { date: "2021-10-04", price: 18.6 },
      { date: "2021-10-11", price: 21.4 },
      { date: "2021-10-18", price: 24.8 },
      { date: "2021-10-25", price: 22.2 },
      { date: "2021-11-01", price: 19.6 },
      { date: "2021-11-08", price: 17.2 },
      { date: "2021-11-15", price: 20.4 },
      { date: "2021-11-22", price: 23.8 },
      { date: "2021-11-29", price: 26.2 },
      { date: "2021-12-06", price: 24.6 },
      { date: "2021-12-13", price: 22.2 },
      { date: "2021-12-20", price: 19.8 },
      { date: "2021-12-27", price: 17.4 },
    ],
  },
  // AMC Entertainment (AMC) - 2021 (Meme Stock)
  {
    symbol: "AMC",
    name: "AMC Entertainment",
    data: [
      { date: "2021-01-04", price: 2.04 },
      { date: "2021-01-11", price: 2.96 },
      { date: "2021-01-18", price: 3.19 },
      { date: "2021-01-25", price: 4.96 },
      { date: "2021-02-01", price: 7.84 },
      { date: "2021-02-08", price: 13.26 },
      { date: "2021-02-15", price: 5.51 },
      { date: "2021-02-22", price: 8.63 },
      { date: "2021-03-01", price: 10.54 },
      { date: "2021-03-08", price: 14.34 },
      { date: "2021-03-15", price: 12.09 },
      { date: "2021-03-22", price: 9.86 },
      { date: "2021-03-29", price: 10.54 },
      { date: "2021-04-05", price: 8.63 },
      { date: "2021-04-12", price: 7.84 },
      { date: "2021-04-19", price: 9.86 },
      { date: "2021-04-26", price: 10.54 },
      { date: "2021-05-03", price: 8.63 },
      { date: "2021-05-10", price: 7.84 },
      { date: "2021-05-17", price: 9.86 },
      { date: "2021-05-24", price: 10.54 },
      { date: "2021-05-31", price: 8.63 },
      { date: "2021-06-07", price: 7.84 },
      { date: "2021-06-14", price: 9.86 },
      { date: "2021-06-21", price: 10.54 },
      { date: "2021-06-28", price: 8.63 },
      { date: "2021-07-05", price: 7.84 },
      { date: "2021-07-12", price: 9.86 },
      { date: "2021-07-19", price: 10.54 },
      { date: "2021-07-26", price: 8.63 },
      { date: "2021-08-02", price: 7.84 },
      { date: "2021-08-09", price: 9.86 },
      { date: "2021-08-16", price: 10.54 },
      { date: "2021-08-23", price: 8.63 },
      { date: "2021-08-30", price: 7.84 },
      { date: "2021-09-06", price: 9.86 },
      { date: "2021-09-13", price: 10.54 },
      { date: "2021-09-20", price: 8.63 },
      { date: "2021-09-27", price: 7.84 },
      { date: "2021-10-04", price: 9.86 },
      { date: "2021-10-11", price: 10.54 },
      { date: "2021-10-18", price: 8.63 },
      { date: "2021-10-25", price: 7.84 },
      { date: "2021-11-01", price: 9.86 },
      { date: "2021-11-08", price: 10.54 },
      { date: "2021-11-15", price: 8.63 },
      { date: "2021-11-22", price: 7.84 },
      { date: "2021-11-29", price: 9.86 },
      { date: "2021-12-06", price: 10.54 },
      { date: "2021-12-13", price: 8.63 },
      { date: "2021-12-20", price: 7.84 },
      { date: "2021-12-27", price: 9.86 },
    ],
  },
];

interface TradingDecision {
  action: "buy" | "sell" | "pass";
  units: number;
  reasoning: string;
  price: number;
  date: string;
  pnl: number;
  totalPnl: number;
  cash: number;
  shares: number;
  position: number; // Net position: positive = long, negative = short
}

interface PlayerResult {
  player: 1 | 2;
  decisions: TradingDecision[];
  finalPnl: number;
  finalCash: number;
  finalShares: number;
  totalReturn: number;
  strategy: string;
}

class Trader {
  private playerId: 1 | 2;
  private strategy: string;
  private decisions: TradingDecision[];
  private cash: number; // C - current cash
  private position: number; // P - current position (net shares)
  private totalPnl: number;
  private initialCash: number;

  constructor(playerId: 1 | 2, strategy: string) {
    this.playerId = playerId;
    this.strategy = strategy;
    this.decisions = [];
    this.cash = 1000; // C - Start with $1,000
    this.position = 0; // P - Start with 0 position
    this.totalPnl = 0;
    this.initialCash = 1000;
  }

  async makeDecision(
    currentPrice: number,
    date: string,
    priceHistory: { price: number; date: string }[],
    period: number
  ): Promise<TradingDecision> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a quantitative trader in a simulated trading competition. You MUST strictly follow your assigned trading strategy.

CURRENT SITUATION:
- Current Price (p): $${currentPrice.toFixed(2)}
- Current Date: ${date}
- Period: ${period}/20
- Cash (C): $${this.cash.toFixed(2)}
- Position (P): ${this.position} shares
- Current P&L: $${this.totalPnl.toFixed(2)} (C + p*P - 1000)

YOUR ASSIGNED TRADING STRATEGY (FOLLOW THIS EXACTLY):
${this.strategy}

PRICE HISTORY (last 10 periods):
${priceHistory
                .slice(-10)
                .map((p) => `${p.date}: $${p.price.toFixed(2)}`)
                .join("\n")}

IMPORTANT RULES:
1. You MUST follow your assigned strategy above - do not deviate from it
2. You can BUY, SELL, or PASS
3. If BUYING: specify number of shares (must be affordable with current cash) - adds to position
4. If SELLING: specify number of shares (can sell even with 0 position to go short) - subtracts from position
5. If PASSING: no action taken
6. Your reasoning MUST explain how your decision follows your assigned strategy
7. Consider risk management and position sizing within your strategy
8. You have 20 total periods to trade
9. IMPORTANT: You can SELL even with 0 position - this creates a SHORT position (negative P)
10. Shorting means you profit when the stock price goes DOWN

CRITICAL: You MUST respond with ONLY a valid JSON object in this exact format:
{
  "action": "buy",
  "units": 10,
  "reasoning": "Your reasoning here - MUST reference your strategy"
}

Valid actions are: "buy", "sell", "pass"
Units must be a positive integer (0 for pass)
Reasoning must explain how this decision follows your assigned strategy`,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      const content =
        response.choices[0]?.message?.content ||
        '{"action": "pass", "units": 0, "reasoning": "No response"}';

      console.log(`Player ${this.playerId} raw response:`, content);

      let parsed: {
        action: "buy" | "sell" | "pass";
        units: number;
        reasoning: string;
      };

      try {
        // Clean the response - remove any markdown formatting or extra text
        let cleanContent = content.trim();

        // Remove markdown code blocks if present
        if (cleanContent.startsWith("```json")) {
          cleanContent = cleanContent
            .replace(/^```json\s*/, "")
            .replace(/\s*```$/, "");
        } else if (cleanContent.startsWith("```")) {
          cleanContent = cleanContent
            .replace(/^```\s*/, "")
            .replace(/\s*```$/, "");
        }

        // Find JSON object in the response
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanContent = jsonMatch[0];
        }

        parsed = JSON.parse(cleanContent);

        // Validate the parsed object
        if (
          !parsed.action ||
          !["buy", "sell", "pass"].includes(parsed.action)
        ) {
          throw new Error("Invalid action");
        }
        if (typeof parsed.units !== "number" || parsed.units < 0) {
          parsed.units = 0;
        }
        if (typeof parsed.reasoning !== "string") {
          parsed.reasoning = "No reasoning provided";
        }

        console.log(`Player ${this.playerId} parsed successfully:`, parsed);
      } catch (error) {
        console.error(`Player ${this.playerId} JSON parse error:`, error);
        console.error(`Raw content was:`, content);
        parsed = {
          action: "pass",
          units: 0,
          reasoning: `Parse error: ${error instanceof Error ? error.message : "Unknown error"
            }`,
        };
      }

      // Calculate P&L BEFORE processing the trade (using current state)
      // Holy grail P&L formula: PNL = C + p*P - 1000
      const pnlBeforeTrade =
        this.cash + this.position * currentPrice - this.initialCash;
      this.totalPnl = pnlBeforeTrade;

      // Validate and execute the trade
      let actualUnits = 0;
      let actualAction: "buy" | "sell" | "pass" = "pass";

      if (parsed.action === "buy" && parsed.units > 0) {
        const maxAffordable = Math.floor(this.cash / currentPrice);
        actualUnits = Math.min(parsed.units, maxAffordable);
        if (actualUnits > 0) {
          actualAction = "buy";
          // C becomes C - N * p, P becomes P + N
          this.cash -= actualUnits * currentPrice;
          this.position += actualUnits;
        }
      } else if (parsed.action === "sell" && parsed.units > 0) {
        // Can sell only if we have enough cash: C >= N * p
        const maxSellable = Math.floor(this.cash / currentPrice);
        actualUnits = Math.min(parsed.units, maxSellable);
        if (actualUnits > 0) {
          actualAction = "sell";
          // C becomes C - N * p, P becomes P - N (P can go negative for shorting)
          this.cash -= actualUnits * currentPrice;
          this.position -= actualUnits;
        }
      }

      // Calculate P&L for this trade (only for sells, showing realized profit/loss)
      let tradePnl = 0;
      if (actualAction === "sell") {
        // For sells, we need to calculate the profit/loss on the shares being sold
        // Since we don't track individual share costs, we'll use average cost
        // For simplicity, we'll show 0 for individual trade P&L and focus on total P&L
        tradePnl = 0; // Individual trade P&L not meaningful without cost basis tracking
      }

      const decision: TradingDecision = {
        action: actualAction,
        units: actualUnits,
        reasoning: parsed.reasoning,
        price: currentPrice,
        date,
        pnl: tradePnl,
        totalPnl: pnlBeforeTrade, // Use P&L before the trade
        cash: this.cash,
        shares: this.position, // Keep shares field for compatibility, but it's actually position
        position: this.position, // Net position (positive = long, negative = short)
      };

      this.decisions.push(decision);
      return decision;
    } catch (error) {
      console.error(
        `Error making trading decision for Player ${this.playerId}:`,
        error
      );
      // Calculate P&L for error case
      const errorPnl =
        this.cash + this.position * currentPrice - this.initialCash;
      return {
        action: "pass",
        units: 0,
        reasoning: "Error occurred during decision making",
        price: currentPrice,
        date,
        pnl: 0,
        totalPnl: errorPnl,
        cash: this.cash,
        shares: this.position,
        position: this.position,
      };
    }
  }

  getDecisions(): TradingDecision[] {
    return this.decisions;
  }

  getFinalStats() {
    return {
      finalPnl: this.totalPnl,
      finalCash: this.cash,
      finalShares: this.position, // Keep shares field for compatibility, but it's actually position
      totalReturn: (this.totalPnl / this.initialCash) * 100,
    };
  }
}

export async function POST(request: NextRequest) {
  const { player1Strategy, player2Strategy } = await request.json();

  if (!player1Strategy || !player2Strategy) {
    return new Response("Missing strategies", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Select a different dataset than the last one used
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * MARKET_DATASETS.length);
        } while (
          randomIndex === lastUsedDatasetIndex &&
          MARKET_DATASETS.length > 1
        );

        lastUsedDatasetIndex = randomIndex;
        const randomDataset = MARKET_DATASETS[randomIndex];
        const shuffled = [...randomDataset.data].sort(
          () => Math.random() - 0.5
        );
        const selectedData = shuffled
          .slice(0, 20)
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );

        const asset = `${randomDataset.symbol} (${randomDataset.name})`;
        const startPrice = selectedData[0].price;
        const endPrice = selectedData[selectedData.length - 1].price;
        const totalReturn = ((endPrice - startPrice) / startPrice) * 100;

        console.log(`Starting Quant Trading game`);
        console.log(`Asset: ${asset}`);
        console.log(`Start Price: $${startPrice.toFixed(2)}`);
        console.log(`End Price: $${endPrice.toFixed(2)}`);
        console.log(`Total Return: ${totalReturn.toFixed(2)}%`);

        // Send start event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "start",
              asset,
              startPrice,
              endPrice,
              totalReturn,
              player1Strategy,
              player2Strategy,
            })}\n\n`
          )
        );

        // Initialize traders
        const trader1 = new Trader(1, player1Strategy);
        const trader2 = new Trader(2, player2Strategy);

        // Simulate trading for each period
        for (let i = 0; i < selectedData.length; i++) {
          const { price, date } = selectedData[i];
          const priceHistory = selectedData.slice(0, i + 1);

          console.log(
            `\n--- Period ${i + 1}: ${date} - $${price.toFixed(2)} ---`
          );

          // Both traders make decisions simultaneously
          const [decision1, decision2] = await Promise.all([
            trader1.makeDecision(price, date, priceHistory, i + 1),
            trader2.makeDecision(price, date, priceHistory, i + 1),
          ]);

          console.log(
            `Player 1: ${decision1.action} ${decision1.units} units - ${decision1.reasoning}`
          );
          console.log(
            `Player 2: ${decision2.action} ${decision2.units} units - ${decision2.reasoning}`
          );

          // Stream both decisions
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "decision",
                player: 1,
                decision: decision1,
              })}\n\n`
            )
          );

          // Small delay for visual effect
          await new Promise((resolve) => setTimeout(resolve, 100));

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "decision",
                player: 2,
                decision: decision2,
              })}\n\n`
            )
          );

          // Delay between periods
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Calculate final results
        const stats1 = trader1.getFinalStats();
        const stats2 = trader2.getFinalStats();

        const result1: PlayerResult = {
          player: 1,
          decisions: trader1.getDecisions(),
          finalPnl: stats1.finalPnl,
          finalCash: stats1.finalCash,
          finalShares: stats1.finalShares,
          totalReturn: stats1.totalReturn,
          strategy: player1Strategy,
        };

        const result2: PlayerResult = {
          player: 2,
          decisions: trader2.getDecisions(),
          finalPnl: stats2.finalPnl,
          finalCash: stats2.finalCash,
          finalShares: stats2.finalShares,
          totalReturn: stats2.totalReturn,
          strategy: player2Strategy,
        };

        // Determine winner
        let winner: 1 | 2 | "tie";
        let winnerReason: string;

        if (result1.finalPnl > result2.finalPnl) {
          winner = 1;
          winnerReason = `Player 1 achieved higher P&L: ${result1.finalPnl.toFixed(
            2
          )} vs ${result2.finalPnl.toFixed(2)}`;
        } else if (result2.finalPnl > result1.finalPnl) {
          winner = 2;
          winnerReason = `Player 2 achieved higher P&L: ${result2.finalPnl.toFixed(
            2
          )} vs ${result1.finalPnl.toFixed(2)}`;
        } else {
          winner = "tie";
          winnerReason = `Both players achieved identical P&L: ${result1.finalPnl.toFixed(
            2
          )}`;
        }

        console.log(`\n=== FINAL RESULTS ===`);
        console.log(
          `Player 1 P&L: $${result1.finalPnl.toFixed(
            2
          )} (${result1.totalReturn.toFixed(2)}%)`
        );
        console.log(
          `Player 2 P&L: $${result2.finalPnl.toFixed(
            2
          )} (${result2.totalReturn.toFixed(2)}%)`
        );
        console.log(`Winner: Player ${winner}`);
        console.log(`Reason: ${winnerReason}`);

        // Send end event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "end",
              winner,
              winnerReason,
              player1: result1,
              player2: result2,
              asset,
              startPrice,
              endPrice,
              totalReturn,
            })}\n\n`
          )
        );

        controller.close();
      } catch (error) {
        console.error("Error in trading simulation:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message: "An error occurred during the trading simulation",
            })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
