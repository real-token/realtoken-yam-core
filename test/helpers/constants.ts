import { BigNumber } from "ethers";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
export const AMOUNT_MINT_REALTOKEN = BigNumber.from(
  "1000000000000000000000000"
); // 1000000 RTT
export const AMOUNT_TRANSFER_REALTOKEN = BigNumber.from(
  "1000000000000000000000"
); // 1000 RTT
export const AMOUNT_TRANSFER_STABLE = BigNumber.from("1000000000"); // 1000 USDC

export const PRICE_STABLE_1 = BigNumber.from("1000000");
export const AMOUNT_OFFER_STABLE_1 = BigNumber.from("500000000"); // 500 RTT
export const AMOUNT_APPROVAL_STABLE = BigNumber.from("1000000000");

export const PRICE_STABLE_2 = BigNumber.from("1000001");
export const AMOUNT_OFFER_STABLE_2 = BigNumber.from("600000000"); // 600 RTT

export const PRICE_REALTOKEN_1 = BigNumber.from("55000000"); // 55 USD per RTT
export const PRICE_REALTOKEN_2 = BigNumber.from("60000000"); // 60 USD per RTT
export const AMOUNT_OFFER_REALTOKEN = BigNumber.from("500000000000000000000"); // 500 RTT
export const AMOUNT_APPROVAL_REALTOKEN = BigNumber.from("10000000000000000000"); // 1000 RTT
