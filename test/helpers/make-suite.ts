import {
  ZERO_ADDRESS,
  PRICE_STABLE_1,
  PRICE_REALTOKEN_1,
  AMOUNT_MINT_REALTOKEN,
  AMOUNT_TRANSFER_REALTOKEN,
  AMOUNT_TRANSFER_STABLE,
  AMOUNT_APPROVAL_REALTOKEN,
  AMOUNT_APPROVAL_STABLE,
  AMOUNT_OFFER_REALTOKEN,
  AMOUNT_OFFER_STABLE_1,
  ONE_YEAR_IN_SECS,
} from "./constants";
import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { BridgeToken } from "../typechain/BridgeToken";
import { Processor } from "../typechain/Processor";
import { RuleEngine } from "../typechain/RuleEngine";
import { ComplianceRegistry } from "../typechain/ComplianceRegistry";
import { UserFreezeRule } from "../typechain/UserFreezeRule";
import { VestingRule } from "../typechain/VestingRule";
import { UserAttributeValidToRule } from "../typechain/UserAttributeValidToRule";
import { RealTokenYamUpgradeable } from "../typechain/RealTokenYamUpgradeable";

export async function makeSuite() {
  const [admin, moderator, user1, user2]: SignerWithAddress[] =
    await ethers.getSigners();

  const USDCTokenTest = await ethers.getContractFactory("USDCTokenTest");
  const USDCRealT = await ethers.getContractFactory("USDCRealT");
  const WXDAIRealT = await ethers.getContractFactory("WXDAIRealT");
  const WETHRealT = await ethers.getContractFactory("WETHRealT");

  const RuleEngineFactory = await ethers.getContractFactory("RuleEngine");
  const ProcessorFactory = await ethers.getContractFactory("Processor");
  const BridgeTokenFactory = await ethers.getContractFactory("BridgeToken");
  const UserAttributeValidToRuleFactory = await ethers.getContractFactory(
    "UserAttributeValidToRule"
  );
  const UserFreezeRuleFactory = await ethers.getContractFactory(
    "UserFreezeRule"
  );
  const VestingRuleFactory = await ethers.getContractFactory("VestingRule");
  const ComplianceRegistryFactory = await ethers.getContractFactory(
    "ComplianceRegistry"
  );
  const RealTokenYamUpgradeableFactory = await ethers.getContractFactory(
    "RealTokenYamUpgradeableV3" // use the latest version of RealTokenYamUpgradeable
  );

  const usdcTokenTest = await USDCTokenTest.deploy();
  const usdcRealT = await upgrades.deployProxy(USDCRealT, []);
  const wxdaiRealT = await upgrades.deployProxy(WXDAIRealT, []);
  const wethRealT = await upgrades.deployProxy(WETHRealT, []);

  // Deploy ComplianceRegistry contract: owner = admin
  const complianceRegistry = (await upgrades.deployProxy(
    ComplianceRegistryFactory,
    [admin.address]
  )) as ComplianceRegistry;

  // Deploy UserAttributeValidToRule contract
  const userAttributeValidToRule = (await upgrades.deployProxy(
    UserAttributeValidToRuleFactory,
    [complianceRegistry.address]
  )) as UserAttributeValidToRule;

  // Deploy UserFreezeRule contract
  const userFreezeRule = (await upgrades.deployProxy(UserFreezeRuleFactory, [
    complianceRegistry.address,
  ])) as UserFreezeRule;

  // Deploy VestingRule contract
  const vestingRule = (await upgrades.deployProxy(VestingRuleFactory, [
    complianceRegistry.address,
  ])) as VestingRule;

  // Deploy RuleEngine contract: owner = admin
  const ruleEngine = (await upgrades.deployProxy(RuleEngineFactory, [
    admin.address,
  ])) as RuleEngine;

  // Set rules in ruleEngine
  await ruleEngine.setRules([
    ZERO_ADDRESS,
    userFreezeRule.address, // Rule 1
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    userAttributeValidToRule.address, // Rule 11
    vestingRule.address, // Rule 12
  ]);

  // Deploy Processor contract: owner = admin
  const processor = (await upgrades.deployProxy(
    ProcessorFactory,
    [admin.address, ruleEngine.address], // owner address, ruleEngine address
    { initializer: "initialize(address owner, address _ruleEngine)" }
  )) as Processor;

  // Deploy BridgeToken contract: owner = admin
  const bridgeToken = (await upgrades.deployProxy(
    BridgeTokenFactory,
    [
      admin.address, // owner address
      processor.address, // processor address
      "Bridge Token Test", // name
      "BTT", // symbol
      18, // decimals
      [admin.address], // trustedIntermediaries
    ],
    {
      initializer:
        "initialize(address owner, address processor, string name, string symbol, uint8 decimals, address[] trustedIntermediaries)",
    }
  )) as BridgeToken;

  // Set rules in bridgeToken
  // Rule 11: tokenId
  // Rule 1: isFrozen
  // Rule 12: VestingTimestamp
  // Source: https://github.com/MtPelerin/bridge-v2/blob/master/docs/RuleEngine.md
  const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;
  console.log("Unlock timestamp: ", unlockTime);

  await bridgeToken
    .connect(admin)
    .setRules(["11", "1", "12"], ["100001", "0", unlockTime]);
  console.log("BridgeToken Rules: ", await bridgeToken.rules());

  // Set roles: administrator, supplier
  await bridgeToken.addAdministrator(admin.address);
  await bridgeToken.addSupplier(admin.address);
  // Mint 1000000 BTT to admin address
  await bridgeToken.mint(admin.address, AMOUNT_MINT_REALTOKEN);
  console.log("BTT Admin balance ", await bridgeToken.balanceOf(admin.address));

  // Whitelist admin, user1, user2
  await complianceRegistry.registerUser(
    admin.address,
    [BigNumber.from("100001")],
    [1]
  );
  await complianceRegistry.registerUser(
    user1.address,
    [BigNumber.from("100001")],
    [1]
  );
  await complianceRegistry.registerUser(
    user2.address,
    [BigNumber.from("100001")],
    [1]
  );

  // Deploy RealTokenYamUpgradeable contract
  const realTokenYamUpgradeable = (await upgrades.deployProxy(
    RealTokenYamUpgradeableFactory,
    [admin.address, moderator.address]
  )) as RealTokenYamUpgradeable;

  return {
    usdcTokenTest,
    usdcRealT,
    wxdaiRealT,
    wethRealT,
    bridgeToken,
    realTokenYamUpgradeable,
    complianceRegistry,
    ruleEngine,
    processor,
    unlockTime,
    admin,
    moderator,
    user1,
    user2,
  };
}

export async function makeSuiteWhitelist() {
  const {
    usdcTokenTest,
    usdcRealT,
    wxdaiRealT,
    wethRealT,
    bridgeToken,
    realTokenYamUpgradeable,
    complianceRegistry,
    ruleEngine,
    unlockTime,
    admin,
    moderator,
    user1,
    user2,
  } = await loadFixture(makeSuite);
  await realTokenYamUpgradeable
    .connect(admin)
    .toggleWhitelistWithType(
      [bridgeToken.address, usdcRealT.address, usdcTokenTest.address],
      [1, 2, 3]
    );
  console.log(
    "balance admin usdcRealT: ",
    await usdcRealT.balanceOf(admin.address)
  );

  await bridgeToken.transfer(user1.address, AMOUNT_TRANSFER_REALTOKEN); // Send 1000 RTT to user1
  await bridgeToken.transfer(user2.address, AMOUNT_TRANSFER_REALTOKEN); // Send 1000 RTT to user2
  await usdcRealT.transfer(user1.address, AMOUNT_TRANSFER_STABLE); // Send 1000 USDCRealT to user1
  await usdcRealT.transfer(user2.address, AMOUNT_TRANSFER_STABLE); // Send 1000 USDCRealT to user2
  await usdcTokenTest.transfer(user1.address, AMOUNT_TRANSFER_STABLE); // Send 1000 USDCTokenTest to user1
  await usdcTokenTest.transfer(user2.address, AMOUNT_TRANSFER_STABLE); // Send 1000 USDCTokenTest to user2

  return {
    usdcTokenTest,
    usdcRealT,
    wxdaiRealT,
    wethRealT,
    bridgeToken,
    realTokenYamUpgradeable,
    complianceRegistry,
    ruleEngine,
    unlockTime,
    admin,
    moderator,
    user1,
    user2,
  };
}

export async function makeSuiteWhitelistAndCreateOffer() {
  const {
    usdcTokenTest,
    usdcRealT,
    wxdaiRealT,
    wethRealT,
    realTokenYamUpgradeable,
    complianceRegistry,
    ruleEngine,
    bridgeToken,
    unlockTime,
    admin,
    moderator,
    user1,
    user2,
  } = await loadFixture(makeSuiteWhitelist);
  // Create offer: offerId = 0 USDCRealT/USDCTokenTest (type 2/3)
  await realTokenYamUpgradeable
    .connect(user1)
    .createOffer(
      usdcRealT.address,
      usdcTokenTest.address,
      ZERO_ADDRESS,
      PRICE_STABLE_1,
      AMOUNT_OFFER_STABLE_1
    );

  // Create offer: offerId = 1 USDCTokenTest/RealToken (type 3/1)
  await realTokenYamUpgradeable
    .connect(user1)
    .createOffer(
      usdcTokenTest.address,
      bridgeToken.address,
      ZERO_ADDRESS,
      PRICE_STABLE_1,
      AMOUNT_OFFER_STABLE_1
    );

  // Create offer: offerId = 2 RealToken/USDCRealT (type 1/2)
  // await time.increaseTo(unlockTime);
  // await realTokenYamUpgradeable
  //   .connect(user1)
  //   .createOfferWithPermit(
  //     bridgeToken.address,
  //     usdcRealT.address,
  //     ZERO_ADDRESS,
  //     50000000,
  //     BigNumber.from("1000000000000000000000")
  //   );

  await bridgeToken
    .connect(user1)
    .approve(realTokenYamUpgradeable.address, AMOUNT_APPROVAL_REALTOKEN);
  await bridgeToken
    .connect(user2)
    .approve(realTokenYamUpgradeable.address, AMOUNT_APPROVAL_REALTOKEN);
  await usdcRealT
    .connect(user1)
    .approve(realTokenYamUpgradeable.address, AMOUNT_APPROVAL_STABLE);
  await usdcRealT
    .connect(user2)
    .approve(realTokenYamUpgradeable.address, AMOUNT_APPROVAL_STABLE);
  await usdcTokenTest
    .connect(user1)
    .approve(realTokenYamUpgradeable.address, AMOUNT_APPROVAL_STABLE);
  await usdcTokenTest
    .connect(user2)
    .approve(realTokenYamUpgradeable.address, AMOUNT_APPROVAL_STABLE);

  return {
    bridgeToken,
    usdcTokenTest,
    usdcRealT,
    wxdaiRealT,
    wethRealT,
    realTokenYamUpgradeable,
    complianceRegistry,
    ruleEngine,
    unlockTime,
    admin,
    moderator,
    user1,
    user2,
  };
}
