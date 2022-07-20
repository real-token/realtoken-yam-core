import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { HardhatToken } from "../typechain/HardhatToken";

describe("HardhatToken", function () {
  let hardhatToken: HardhatToken;
  let admin: SignerWithAddress;
  let guest1: SignerWithAddress;
  let guest2: SignerWithAddress;
  let guest3: SignerWithAddress;

  beforeEach(async () => {
    const HardhatToken = await ethers.getContractFactory(
      "contracts/HardhatToken.sol:HardhatToken"
    );

    hardhatToken = (await HardhatToken.deploy()) as HardhatToken;

    [admin, guest1, guest2, guest3] = await ethers.getSigners();
  });

  it("test msgSender", async function () {
    expect(await hardhatToken.msgSender()).to.equal(admin.address);
    expect(await hardhatToken.connect(guest1).msgSender()).to.equal(
      guest1.address
    );
    expect(await hardhatToken.connect(guest2).msgSender()).to.equal(
      guest2.address
    );
    expect(await hardhatToken.connect(guest3).msgSender()).to.equal(
      guest3.address
    );
  });

  it("mint", async function () {
    expect(await hardhatToken.balanceOf(admin.address)).to.equal(
      "1000000000000000000000000"
    );

    await hardhatToken.mint(guest1.address, 200000000);

    expect(await hardhatToken.balanceOf(guest1.address)).to.equal(200000000);

    await hardhatToken.mint(guest2.address, 700000000);

    expect(await hardhatToken.balanceOf(guest2.address)).to.equal(700000000);

    await hardhatToken.mint(guest3.address, 100000000);

    expect(await hardhatToken.balanceOf(guest3.address)).to.equal(100000000);
  });

  it("transfer", async function () {
    await hardhatToken.transfer(guest1.address, 200000000);

    await hardhatToken.transfer(guest2.address, 300000000);

    await hardhatToken.transfer(guest3.address, 400000000);

    expect(await hardhatToken.balanceOf(guest1.address)).to.equal(200000000);

    expect(await hardhatToken.balanceOf(guest2.address)).to.equal(300000000);

    expect(await hardhatToken.balanceOf(guest3.address)).to.equal(400000000);
  });
});
