// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { IERC20 } from "./interfaces/IERC20.sol";
import { ISwapCatUpgradeable } from "./interfaces/ISwapCatUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract SwapCatUpgradeable is
  AccessControlUpgradeable,
  UUPSUpgradeable,
  ISwapCatUpgradeable
{
  bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

  // lets make mappings to store offer data
  mapping(uint24 => uint256) internal price;
  mapping(uint24 => address) internal offertoken;
  mapping(uint24 => address) internal buyertoken;
  mapping(uint24 => address) internal seller;
  mapping(address => bool) public whitelistedTokens;
  uint24 internal offercount;

  // admin address, receives donations and can move stuck funds, nothing else
  address public admin;

  function initialize(address admin_, address adminFee_) external initializer {
    __AccessControl_init();
    __UUPSUpgradeable_init();

    _grantRole(DEFAULT_ADMIN_ROLE, admin_);
    _grantRole(UPGRADER_ROLE, admin_);
    admin = adminFee_;
  }

  /// @notice The admin (with upgrader role) uses this function to update the contract
  /// @dev This function is always needed in future implementation contract versions, otherwise, the contract will not be upgradeable
  /// @param newImplementation is the address of the new implementation contract
  function _authorizeUpgrade(address newImplementation)
    internal
    override
    onlyRole(UPGRADER_ROLE)
  {}

  /// @inheritdoc	ISwapCatUpgradeable
  function toggleWhitelist(address token_)
    external
    override
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    whitelistedTokens[token_] = !whitelistedTokens[token_];
  }

  modifier onlyWhitelistedToken(address token_) {
    require(whitelistedTokens[token_], "Token is not whitelisted");
    _;
  }

  function isWhitelisted(address token_) external view override returns (bool) {
    return whitelistedTokens[token_];
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function createOffer(
    address _offertoken,
    address _buyertoken,
    uint256 _price,
    uint24 _offerid
  )
    public
    override
    onlyWhitelistedToken(_offertoken)
    onlyWhitelistedToken(_buyertoken)
    returns (uint24)
  {
    // if no offerid is given a new offer is made, if offerid is given only the offers price is changed if owner matches
    if (_offerid == 0) {
      _offerid = offercount;
      offercount++;
      seller[_offerid] = msg.sender;
      offertoken[_offerid] = _offertoken;
      buyertoken[_offerid] = _buyertoken;
    } else {
      require(
        seller[_offerid] == msg.sender,
        "only original seller can change offer!"
      );
    }
    price[_offerid] = _price;

    // returns the offerid
    return _offerid;
  }

  function deleteOffer(uint24 _offerid) public override {
    require(seller[_offerid] == msg.sender, "Not the seller of this offer!");
    delete seller[_offerid];
    delete offertoken[_offerid];
    delete buyertoken[_offerid];
    delete price[_offerid];
  }

  // return the total number of offers to loop through all offers
  // its the web frontends job to keep track of offers

  function getOfferCount() public view override returns (uint24) {
    return offercount - 1;
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function tokenInfo(address _tokenaddr)
    public
    view
    override
    returns (
      uint256,
      string memory,
      string memory
    )
  {
    IERC20 tokeni = IERC20(_tokenaddr);
    return (tokeni.decimals(), tokeni.symbol(), tokeni.name());
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function showOffer(uint24 _offerid)
    public
    view
    override
    returns (
      address,
      address,
      address,
      uint256,
      uint256
    )
  {
    IERC20 offertokeni = IERC20(offertoken[_offerid]);

    // get offertokens balance and allowance, whichever is lower is the available amount
    uint256 availablebalance = offertokeni.balanceOf(seller[_offerid]);
    uint256 availableallow = offertokeni.allowance(
      seller[_offerid],
      address(this)
    );

    if (availableallow < availablebalance) {
      availablebalance = availableallow;
    }

    return (
      offertoken[_offerid],
      buyertoken[_offerid],
      seller[_offerid],
      price[_offerid],
      availablebalance
    );
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function pricePreview(uint24 _offerid, uint256 _amount)
    public
    view
    override
    returns (uint256)
  {
    IERC20 offertokeni = IERC20(offertoken[_offerid]);
    return
      (_amount * price[_offerid]) / (uint256(10)**offertokeni.decimals()) + 1;
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function buy(
    uint24 _offerid,
    uint256 _offertokenamount,
    uint256 _price
  ) public override {
    IERC20 offertokeninterface = IERC20(offertoken[_offerid]);
    IERC20 buyertokeninterface = IERC20(buyertoken[_offerid]);

    // given price is being checked with recorded data from mappings
    require(price[_offerid] == _price, "offer price wrong");

    // calculate the price of the order
    uint256 buyertokenAmount = (_offertokenamount * _price) /
      (uint256(10)**offertokeninterface.decimals()) +
      1;

    // some old erc20 tokens give no return value so we must work around by getting their balance before and after the exchange
    uint256 oldbuyerbalance = buyertokeninterface.balanceOf(msg.sender);
    uint256 oldsellerbalance = offertokeninterface.balanceOf(seller[_offerid]);

    // finally do the exchange
    buyertokeninterface.transferFrom(
      msg.sender,
      seller[_offerid],
      buyertokenAmount
    );
    offertokeninterface.transferFrom(
      seller[_offerid],
      msg.sender,
      _offertokenamount
    );

    // now check if the balances changed on both accounts.
    // we do not check for exact amounts since some tokens behave differently with fees, burnings, etc
    // we assume if both balances are higher than before all is good
    require(
      oldbuyerbalance > buyertokeninterface.balanceOf(msg.sender),
      "buyer error"
    );
    require(
      oldsellerbalance > offertokeninterface.balanceOf(seller[_offerid]),
      "seller error"
    );
  }

  // in case someone wrongfully directly sends erc20 to this contract address, the admin can move them out
  function saveLostTokens(address token) public {
    IERC20 tokeninterface = IERC20(token);
    tokeninterface.transfer(admin, tokeninterface.balanceOf(address(this)));
  }

  /**
   * @dev This empty reserved space is put in place to allow future versions to add new
   * variables without shifting down storage in the inheritance chain.
   * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
   */
  uint256[43] private __gap;
}
