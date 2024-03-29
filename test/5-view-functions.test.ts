import { expect } from "chai";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { makeSuiteWhitelistAndCreateOffer } from "./helpers/make-suite";
import { ZERO_ADDRESS } from "../helpers/constants";
import { PRICE_STABLE_1 } from "./helpers/constants";

describe("5. RealTokenYamUpgradeable view functions", function () {
  describe("5.1. View functions: getOfferCount/tokenInfo/showOffer/pricePreview", function () {
    it("getOfferCount: should return the correct number of offers", async function () {
      const { realTokenYamUpgradeable } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );
      expect(await realTokenYamUpgradeable.getOfferCount()).to.equal(2);
    });
    it("Function tokenInfo: should work", async function () {
      const { bridgeToken, usdcTokenTest, realTokenYamUpgradeable } =
        await loadFixture(makeSuiteWhitelistAndCreateOffer);

      expect(
        await realTokenYamUpgradeable.tokenInfo(bridgeToken.address)
      ).to.deep.equal([
        BigNumber.from(await bridgeToken.decimals()),
        await bridgeToken.symbol(),
        await bridgeToken.name(),
      ]);

      expect(
        await realTokenYamUpgradeable.tokenInfo(usdcTokenTest.address)
      ).to.deep.equal([
        BigNumber.from(await usdcTokenTest.decimals()),
        await usdcTokenTest.symbol(),
        await usdcTokenTest.name(),
      ]);
    });

    it("Function showOffer: should work", async function () {
      const {
        bridgeToken,
        usdcRealT,
        usdcTokenTest,
        realTokenYamUpgradeable,
        user1,
      } = await loadFixture(makeSuiteWhitelistAndCreateOffer);

      // Test function: showOffer (offerToken buyerToken, sellerAddress, price)
      expect((await realTokenYamUpgradeable.showOffer(0)).slice(0, 5)).to.eql([
        usdcRealT.address,
        usdcTokenTest.address,
        user1.address,
        ZERO_ADDRESS,
        PRICE_STABLE_1,
      ]);

      // Test function: showOffer (min(allowance, balance, amounts[offerId]))
      expect((await realTokenYamUpgradeable.showOffer(0))[5]).to.equal(
        Math.min(
          await usdcRealT.allowance(
            user1.address,
            realTokenYamUpgradeable.address
          ),
          Number(await usdcRealT.balanceOf(user1.address)),
          (await realTokenYamUpgradeable.getInitialOffer(0))[5]
        )
      );
    });

    it("Function pricePreview: should work", async function () {
      const { realTokenYamUpgradeable } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      // Test pricePreview function
      expect(
        await realTokenYamUpgradeable.pricePreview(0, BigNumber.from(1000000))
      ).to.equal(BigNumber.from(1000000));
    });
  });
});
