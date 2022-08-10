// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { IERC20 } from "../interfaces/IERC20.sol";
import "../interfaces/ISwapCatUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract SwapCatUpgradeableV2 is
  AccessControlUpgradeable,
  UUPSUpgradeable,
  ISwapCatUpgradeable
{
  bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

  mapping(uint256 => uint256) internal price;
  mapping(uint256 => address) internal offerToken;
  mapping(uint256 => address) internal buyerToken;
  mapping(uint256 => address) internal seller;
  mapping(address => bool) public whitelistedTokens;
  uint256 internal offerCount;
  address public admin; // admin address
  address public moderator; // moderator address, can move stuck funds
  IComplianceRegistry private _complianceRegistry;
  address private _trustedIntermediary;
  address[] private _trustedIntermediaries;

  /// @notice the initialize function to execute only once during the contract deployment
  /// @param admin_ address of the default admin account: whitelist tokens, delete frozen offers, upgrade the contract
  /// @param moderator_ address of the admin with unique responsibles
  function initialize(
    address admin_,
    address moderator_,
    IComplianceRegistry complianceRegistry_,
    address trustedIntermediary_
  ) external initializer {
    __AccessControl_init();
    __UUPSUpgradeable_init();

    _grantRole(DEFAULT_ADMIN_ROLE, admin_);
    _grantRole(UPGRADER_ROLE, admin_);
    admin = admin_;
    moderator = moderator_;

    _complianceRegistry = complianceRegistry_;
    _trustedIntermediary = trustedIntermediary_;
    _trustedIntermediaries.push(trustedIntermediary_);
  }

  /// @notice The admin (with upgrader role) uses this function to update the contract
  /// @dev This function is always needed in future implementation contract versions, otherwise, the contract will not be upgradeable
  /// @param newImplementation is the address of the new implementation contract
  function _authorizeUpgrade(address newImplementation)
    internal
    override
    onlyRole(UPGRADER_ROLE)
  {}

  /**
   * @dev Only moderator can call functions marked by this modifier.
   **/
  modifier onlyModerator() {
    require(msg.sender == moderator, "Caller is not moderator");
    _;
  }

  /**
   * @dev Only whitelisted token can be used by functions marked by this modifier.
   **/
  modifier onlyWhitelistedToken(address token_) {
    require(whitelistedTokens[token_], "Token is not whitelisted");
    _;
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function toggleWhitelist(address token_)
    external
    override
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    whitelistedTokens[token_] = !whitelistedTokens[token_];
    if (whitelistedTokens[token_]) emit TokenWhitelisted(token_);
    else emit TokenUnWhitelisted(token_);
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function isWhitelisted(address token_) external view override returns (bool) {
    return whitelistedTokens[token_];
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function createOffer(
    address _offerToken,
    address _buyerToken,
    uint256 _price,
    uint256 _offerId
  )
    external
    override
    onlyWhitelistedToken(_offerToken)
    onlyWhitelistedToken(_buyerToken)
    returns (uint256)
  {
    // if no offerId is given a new offer is made, if offerId is given only the offers price is changed if owner matches
    if (_offerId == 0) {
      _offerId = offerCount;
      offerCount++;
      seller[_offerId] = msg.sender;
      offerToken[_offerId] = _offerToken;
      buyerToken[_offerId] = _buyerToken;
    } else {
      require(
        seller[_offerId] == msg.sender,
        "only the seller can change offer"
      );
    }
    price[_offerId] = _price;

    emit OfferCreated(_offerToken, _buyerToken, _price, _offerId);

    // returns the offerId
    return _offerId;
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function deleteOffer(uint256 _offerId) external override {
    require(seller[_offerId] == msg.sender, "only the seller can delete offer");
    delete seller[_offerId];
    delete offerToken[_offerId];
    delete buyerToken[_offerId];
    delete price[_offerId];
    emit OfferDeleted(_offerId);
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function deleteOfferByAdmin(uint256 _offerId)
    external
    override
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    delete seller[_offerId];
    delete offerToken[_offerId];
    delete buyerToken[_offerId];
    delete price[_offerId];
    emit OfferDeleted(_offerId);
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function getOfferCount() public view override returns (uint256) {
    return offerCount - 1;
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
  function showOffer(uint256 _offerId)
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
    IERC20 offerTokeni = IERC20(offerToken[_offerId]);

    // get offerTokens balance and allowance, whichever is lower is the available amount
    uint256 availablebalance = offerTokeni.balanceOf(seller[_offerId]);
    uint256 availableallow = offerTokeni.allowance(
      seller[_offerId],
      address(this)
    );

    if (availableallow < availablebalance) {
      availablebalance = availableallow;
    }

    return (
      offerToken[_offerId],
      buyerToken[_offerId],
      seller[_offerId],
      price[_offerId],
      availablebalance
    );
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function pricePreview(uint256 _offerId, uint256 _amount)
    public
    view
    override
    returns (uint256)
  {
    IERC20 offerTokeni = IERC20(offerToken[_offerId]);
    return
      (_amount * price[_offerId]) / (uint256(10)**offerTokeni.decimals()) + 1;
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function buy(
    uint256 _offerId,
    uint256 _offerTokenAmount,
    uint256 _price
  ) public override {
    IERC20 offerTokenInterface = IERC20(offerToken[_offerId]);
    IERC20 buyerTokenInterface = IERC20(buyerToken[_offerId]);

    // given price is being checked with recorded data from mappings
    require(price[_offerId] == _price, "offer price wrong");

    // Check if the transfer is valid
    require(
      _isTransferValid(offerToken[_offerId], seller[_offerId], msg.sender),
      "transfer is not valid"
    );
    // calculate the price of the order
    uint256 buyerTokenAmount = (_offerTokenAmount * _price) /
      (uint256(10)**offerTokenInterface.decimals()) +
      1;

    // some old erc20 tokens give no return value so we must work around by getting their balance before and after the exchange
    uint256 oldbuyerbalance = buyerTokenInterface.balanceOf(msg.sender);
    uint256 oldsellerbalance = offerTokenInterface.balanceOf(seller[_offerId]);

    // finally do the exchange
    buyerTokenInterface.transferFrom(
      msg.sender,
      seller[_offerId],
      buyerTokenAmount
    );
    offerTokenInterface.transferFrom(
      seller[_offerId],
      msg.sender,
      _offerTokenAmount
    );

    // now check if the balances changed on both accounts.
    // we do not check for exact amounts since some tokens behave differently with fees, burnings, etc
    // we assume if both balances are higher than before all is good
    require(
      oldbuyerbalance > buyerTokenInterface.balanceOf(msg.sender),
      "buyer error"
    );
    require(
      oldsellerbalance > offerTokenInterface.balanceOf(seller[_offerId]),
      "seller error"
    );

    emit OfferAccepted(_offerId, msg.sender, _offerTokenAmount);
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function saveLostTokens(address token) external override onlyModerator {
    require(
      msg.sender == moderator || msg.sender == admin,
      "only admin or moderator can move lost tokens"
    );
    IERC20 tokenInterface = IERC20(token);
    tokenInterface.transfer(moderator, tokenInterface.balanceOf(address(this)));
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function transferModerator(address newModerator)
    external
    override
    onlyModerator
  {
    emit ModeratorTransferred(moderator, newModerator);
    moderator = newModerator;
  }

  function _isTransferValid(
    address _token,
    address _from,
    address _to
  ) private view returns (bool) {
    // Rules [11, 1, 111]

    // Get to see whether the token is frozen (rule 1)
    (, uint256 isFrozen) = (IBridgeToken(_token).rule(1));
    // Check rule index 1 (User Freeze Rule)
    require(isFrozen == 0, "Transfer is frozen");

    // Get token vesting time (rule 111)
    (, uint256 vestingTimestamp) = (IBridgeToken(_token).rule(2));
    // Check rule index 111 (Vesting Rule): the current timestamp must be greater than the vesting timestamp
    require(block.timestamp > vestingTimestamp, "Vesting time is not finished");

    // Get to see if the seller and the buyer are whitelisted for the token
    // Check if the user is whitelisted for the token
    (, uint256 tokenId) = (IBridgeToken(_token).rule(0));

    // Check if the seller is whitelisted for the token
    (uint256 sellerId, address sellerTrustedIntermediary) = _complianceRegistry
      .userId(_trustedIntermediaries, _from);
    uint256 isSellerWhitelisted = _complianceRegistry.attribute(
      sellerTrustedIntermediary,
      sellerId,
      tokenId
    );

    // Check if the buyer is whitelisted for the token
    (uint256 buyerId, address buyerTrustedIntermediary) = _complianceRegistry
      .userId(_trustedIntermediaries, _to);
    uint256 isBuyerWhitelisted = _complianceRegistry.attribute(
      buyerTrustedIntermediary,
      buyerId,
      tokenId
    );
    // Both seller and user have to be whitelisted for the token, otherwise the transfer is not valid
    require(
      isSellerWhitelisted != 0 && isBuyerWhitelisted != 0,
      "User is not whitelisted"
    );

    // If everything is fine, return true
    return true;
  }

  /**
   * @dev This empty reserved space is put in place to allow future versions to add new
   * variables without shifting down storage in the inheritance chain.
   * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
   */
  uint256[42] private __gap;

  mapping(address => bool) public whitelistedUsers;

  function toggleWhitelistUser(address user_)
    external
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    whitelistedUsers[user_] = !whitelistedUsers[user_];
  }

  function isWhitelistedUser(address user_) external view returns (bool) {
    return whitelistedUsers[user_];
  }

  modifier onlyWhitelistedUser() {
    require(whitelistedUsers[msg.sender], "user not whitelisted");
    _;
  }
}
