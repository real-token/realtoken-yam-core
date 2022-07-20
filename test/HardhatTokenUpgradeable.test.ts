import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat";
import { HardhatTokenUpgradeable } from "../typechain/HardhatTokenUpgradeable";

describe("HardhatTokenUpgradeable", function () {
  let hardhatTokenUpgradeable: HardhatTokenUpgradeable;
  let admin: SignerWithAddress;
  let guest1: SignerWithAddress;
  let guest2: SignerWithAddress;
  let guest3: SignerWithAddress;

  beforeEach(async () => {
    const HardhatToken = await ethers.getContractFactory(
      "HardhatTokenUpgradeable"
    );

    const hardhatTokenUpgradeableFactory = (await upgrades.deployProxy(
      HardhatToken,
      []
    )) as HardhatTokenUpgradeable;

    hardhatTokenUpgradeable = await hardhatTokenUpgradeableFactory.deployed();

    console.log(hardhatTokenUpgradeable.address);

    [admin, guest1, guest2, guest3] = await ethers.getSigners();
  });

  it("test msgSender", async function () {
    expect(await hardhatTokenUpgradeable.msgSender()).to.equal(admin.address);
    expect(await hardhatTokenUpgradeable.connect(guest1).msgSender()).to.equal(
      guest1.address
    );
    expect(await hardhatTokenUpgradeable.connect(guest2).msgSender()).to.equal(
      guest2.address
    );
    expect(await hardhatTokenUpgradeable.connect(guest3).msgSender()).to.equal(
      guest3.address
    );
  });

  it("mint", async function () {
    expect(await hardhatTokenUpgradeable.balanceOf(admin.address)).to.equal(
      "1000000000000000000000000"
    );

    await hardhatTokenUpgradeable.mint(guest1.address, 200000000, {
      from: admin.address,
    });

    expect(await hardhatTokenUpgradeable.balanceOf(guest1.address)).to.equal(
      200000000
    );

    await hardhatTokenUpgradeable.mint(guest2.address, 700000000, {
      from: admin.address,
    });

    expect(await hardhatTokenUpgradeable.balanceOf(guest2.address)).to.equal(
      700000000
    );

    await hardhatTokenUpgradeable.mint(guest3.address, 100000000, {
      from: admin.address,
    });

    expect(await hardhatTokenUpgradeable.balanceOf(guest3.address)).to.equal(
      100000000
    );
  });

  it("transfer", async function () {
    await hardhatTokenUpgradeable.transfer(guest1.address, 200000000, {
      from: admin.address,
    });

    await hardhatTokenUpgradeable.transfer(guest2.address, 300000000, {
      from: admin.address,
    });

    await hardhatTokenUpgradeable.transfer(guest3.address, 400000000);

    expect(await hardhatTokenUpgradeable.balanceOf(guest1.address)).to.equal(
      200000000
    );

    expect(await hardhatTokenUpgradeable.balanceOf(guest2.address)).to.equal(
      300000000
    );

    expect(await hardhatTokenUpgradeable.balanceOf(guest3.address)).to.equal(
      400000000
    );
  });
});
