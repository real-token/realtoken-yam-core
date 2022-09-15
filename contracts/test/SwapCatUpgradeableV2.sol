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

  mapping(uint256 => uint256) internal prices;
  mapping(uint256 => address) internal offerTokens;
  mapping(uint256 => address) internal buyerTokens;
  mapping(uint256 => address) internal sellers;
  mapping(address => bool) public whitelistedTokens;
  uint256 internal offerCount;
  address public admin; // admin address
  address public moderator; // moderator address, can move stuck funds

  /// @notice the initialize function to execute only once during the contract deployment
  /// @param admin_ address of the default admin account: whitelist tokens, delete frozen offers, upgrade the contract
  /// @param moderator_ address of the admin with unique responsibles
  function initialize(address admin_, address moderator_) external initializer {
    __AccessControl_init();
    __UUPSUpgradeable_init();

    _grantRole(DEFAULT_ADMIN_ROLE, admin_);
    _grantRole(UPGRADER_ROLE, admin_);
    admin = admin_;
    moderator = moderator_;
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

  /**
   * @notice Creates a new offer or updates an existing offer (call this again with the changed price + offerId)
   * @param _offerToken The address of the token to be sold
   * @param _buyerToken The address of the token to be bought
   * @param _offerId The Id of the offer (0 if new offer)
   * @param _price The price in base units of the token to be sold
   * @param _amount The amount of tokens to be sold
   **/
  function _createOffer(
    address _offerToken,
    address _buyerToken,
    uint256 _offerId,
    uint256 _price,
    uint256 _amount
  )
    private
    onlyWhitelistedToken(_offerToken)
    onlyWhitelistedToken(_buyerToken)
  {
    // require(
    //   _isTransferValid(_offerToken, msg.sender, msg.sender, 1),
    //   "Seller can not transfer tokens"
    // );
    // if no offerId is given a new offer is made, if offerId is given only the offers price is changed if owner matches
    if (_offerId == 0) {
      _offerId = offerCount;
      offerCount++;
      sellers[_offerId] = msg.sender;
      offerTokens[_offerId] = _offerToken;
      buyerTokens[_offerId] = _buyerToken;
    } else {
      require(
        sellers[_offerId] == msg.sender,
        "only the seller can change offer"
      );
    }
    prices[_offerId] = _price;

    emit OfferCreated(_offerToken, _buyerToken, _offerId, _price, _amount);
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function createOffer(
    address offerToken,
    address buyerToken,
    uint256 offerId,
    uint256 price,
    uint256 amount
  ) external override {
    _createOffer(offerToken, buyerToken, offerId, price, amount);
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function createOfferWithPermit(
    address offerToken,
    address buyerToken,
    uint256 offerId,
    uint256 price,
    uint256 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external override {
    _createOffer(offerToken, buyerToken, offerId, price, amount);
    IBridgeToken(offerToken).permit(
      msg.sender,
      address(this),
      amount,
      deadline,
      v,
      r,
      s
    );
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function deleteOffer(uint256 offerId) external override {
    require(sellers[offerId] == msg.sender, "only the seller can delete offer");
    delete sellers[offerId];
    delete offerTokens[offerId];
    delete buyerTokens[offerId];
    delete prices[offerId];
    emit OfferDeleted(offerId);
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function deleteOfferByAdmin(uint256 offerId)
    external
    override
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    delete sellers[offerId];
    delete offerTokens[offerId];
    delete buyerTokens[offerId];
    delete prices[offerId];
    emit OfferDeleted(offerId);
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function getOfferCount() public view override returns (uint256) {
    return offerCount - 1;
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function tokenInfo(address tokenaddr)
    public
    view
    override
    returns (
      uint256,
      string memory,
      string memory
    )
  {
    IERC20 tokeni = IERC20(tokenaddr);
    return (tokeni.decimals(), tokeni.symbol(), tokeni.name());
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function showOffer(uint256 offerId)
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
    IERC20 offerTokeni = IERC20(offerTokens[offerId]);

    // get offerTokens balance and allowance, whichever is lower is the available amount
    uint256 availablebalance = offerTokeni.balanceOf(sellers[offerId]);
    uint256 availableallow = offerTokeni.allowance(
      sellers[offerId],
      address(this)
    );

    if (availableallow < availablebalance) {
      availablebalance = availableallow;
    }

    return (
      offerTokens[offerId],
      buyerTokens[offerId],
      sellers[offerId],
      prices[offerId],
      availablebalance
    );
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function pricePreview(uint256 offerId, uint256 amount)
    public
    view
    override
    returns (uint256)
  {
    IERC20 offerTokeni = IERC20(offerTokens[offerId]);
    return
      (amount * prices[offerId]) / (uint256(10)**offerTokeni.decimals()) + 1;
  }

  /**
   * @notice Accepts an existing offer
   * @notice The buyer must bring the price correctly to ensure no frontrunning / changed offer
   * @notice If the offer is changed in meantime, it will not execute
   * @param _offerId The Id of the offer
   * @param _price The price in base units of the offer tokens
   * @param _amount The amount of offer tokens
   **/
  function _buy(
    uint256 _offerId,
    uint256 _price,
    uint256 _amount
  ) private {
    IERC20 offerTokenInterface = IERC20(offerTokens[_offerId]);
    IERC20 buyerTokenInterface = IERC20(buyerTokens[_offerId]);

    // given price is being checked with recorded data from mappings
    require(prices[_offerId] == _price, "offer price wrong");

    // Check if the transfer is valid
    require(
      _isTransferValid(
        offerTokens[_offerId],
        sellers[_offerId],
        msg.sender,
        _amount
      ),
      "transfer is not valid"
    );
    // calculate the price of the order
    uint256 buyerTokenAmount = (_amount * _price) /
      (uint256(10)**offerTokenInterface.decimals()) +
      1;

    // some old erc20 tokens give no return value so we must work around by getting their balance before and after the exchange
    uint256 oldbuyerbalance = buyerTokenInterface.balanceOf(msg.sender);
    uint256 oldsellerbalance = offerTokenInterface.balanceOf(sellers[_offerId]);

    // finally do the exchange
    buyerTokenInterface.transferFrom(
      msg.sender,
      sellers[_offerId],
      buyerTokenAmount
    );
    offerTokenInterface.transferFrom(sellers[_offerId], msg.sender, _amount);

    // now check if the balances changed on both accounts.
    // we do not check for exact amounts since some tokens behave differently with fees, burnings, etc
    // we assume if both balances are higher than before all is good
    require(
      oldbuyerbalance > buyerTokenInterface.balanceOf(msg.sender),
      "buyer error"
    );
    require(
      oldsellerbalance > offerTokenInterface.balanceOf(sellers[_offerId]),
      "seller error"
    );

    emit OfferAccepted(
      _offerId,
      sellers[_offerId],
      msg.sender,
      _price,
      _amount
    );
  }

  function buy(
    uint256 offerId,
    uint256 price,
    uint256 amount
  ) external override {
    _buy(offerId, price, amount);
  }

  function buyWithPermit(
    uint256 offerId,
    uint256 price,
    uint256 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external override {
    uint256 buyerTokenAmount = (price * amount) /
      (uint256(10)**IERC20(offerTokens[offerId]).decimals()) +
      1;
    IBridgeToken(buyerTokens[offerId]).permit(
      msg.sender,
      address(this),
      buyerTokenAmount,
      deadline,
      v,
      r,
      s
    );
    _buy(offerId, price, amount);
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function saveLostTokens(address token) external override {
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

  /**
   * @notice Returns true if the transfer is valid, false otherwise
   * @param _token The token address
   * @param _from The sender address
   * @param _to The receiver address
   * @param _amount The amount of tokens to be transferred
   * @return Whether the transfer is valid
   **/
  function _isTransferValid(
    address _token,
    address _from,
    address _to,
    uint256 _amount
  ) private view returns (bool) {
    // Generalize verifying rules (for example: 11, 1, 12)
    (bool isTransferValid, , ) = IBridgeToken(_token).canTransfer(
      _from,
      _to,
      _amount
    );

    // If everything is fine, return true
    return isTransferValid;
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
