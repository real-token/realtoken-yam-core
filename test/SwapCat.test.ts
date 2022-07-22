import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat";
import { SwapCatUpgradeable } from "../typechain/SwapCatUpgradeable";

describe("SwapCatUpgradeable", function () {
  let SwapCatUpgradeable: SwapCatUpgradeable;
  let admin: SignerWithAddress;
  let adminFee: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  let swapCatUpgradeable: SwapCatUpgradeable;

  beforeEach(async () => {
    const SwapCatUpgradeableFactory = await ethers.getContractFactory(
      "SwapCatUpgradeable"
    );

    [admin, adminFee, user1, user2] = await ethers.getSigners();

    swapCatUpgradeable = (await upgrades.deployProxy(
      SwapCatUpgradeableFactory,
      [admin.address, adminFee.address]
    )) as SwapCatUpgradeable;
  });

  it("Initialize: right admin address", async function () {
    expect(
      await swapCatUpgradeable.hasRole(
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        admin.address
      )
    ).to.equal(true);

    expect(
      await swapCatUpgradeable.hasRole(
        keccak256(toUtf8Bytes("UPGRADER_ROLE")),
        admin.address
      )
    ).to.equal(true);
  });

  it("Upgradeability: should be able to upgrade the contract", async function () {});

  it("Whitelist/UnWhitelist tokens: should work", async function () {});

  it("makeOffer: should work", async function () {});

  it("modifyOffer/deleteOffer by owner: should work", async function () {});

  it("modifyOffer/deleteOffer not by owner: should not work", async function () {});

  it("buy: should work", async function () {});

  it("Transfer/Withdraw ethers: should work", async function () {});

  // TODO add more tests
});
