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
   * @param _price The price in base units of the token to be sold
   * @param _offerId The Id of the offer (0 if new offer)
   **/
  function _createOffer(
    address _offerToken,
    address _buyerToken,
    uint256 _price,
    uint256 _offerId
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

    emit OfferCreated(_offerToken, _buyerToken, _price, _offerId);
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function createOffer(
    address _offerToken,
    address _buyerToken,
    uint256 _price,
    uint256 _offerId
  ) external override {
    _createOffer(_offerToken, _buyerToken, _price, _offerId);
    // IERC20(_offerToken).approve(address(this), _amount);
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function createOfferWithPermit(
    address _offerToken,
    address _buyerToken,
    uint256 _price,
    uint256 _offerId,
    uint256 _amount,
    uint256 _deadline,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external override {
    _createOffer(_offerToken, _buyerToken, _price, _offerId);
    IBridgeToken(_offerToken).permit(
      msg.sender,
      address(this),
      _amount,
      _deadline,
      _v,
      _r,
      _s
    );
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function deleteOffer(uint256 _offerId) external override {
    require(
      sellers[_offerId] == msg.sender,
      "only the seller can delete offer"
    );
    delete sellers[_offerId];
    delete offerTokens[_offerId];
    delete buyerTokens[_offerId];
    delete prices[_offerId];
    emit OfferDeleted(_offerId);
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function deleteOfferByAdmin(uint256 _offerId)
    external
    override
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    delete sellers[_offerId];
    delete offerTokens[_offerId];
    delete buyerTokens[_offerId];
    delete prices[_offerId];
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
    IERC20 offerTokeni = IERC20(offerTokens[_offerId]);

    // get offerTokens balance and allowance, whichever is lower is the available amount
    uint256 availablebalance = offerTokeni.balanceOf(sellers[_offerId]);
    uint256 availableallow = offerTokeni.allowance(
      sellers[_offerId],
      address(this)
    );

    if (availableallow < availablebalance) {
      availablebalance = availableallow;
    }

    return (
      offerTokens[_offerId],
      buyerTokens[_offerId],
      sellers[_offerId],
      prices[_offerId],
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
    IERC20 offerTokeni = IERC20(offerTokens[_offerId]);
    return
      (_amount * prices[_offerId]) / (uint256(10)**offerTokeni.decimals()) + 1;
  }

  /**
   * @notice Accepts an existing offer
   * @notice The buyer must bring the price correctly to ensure no frontrunning / changed offer
   * @notice If the offer is changed in meantime, it will not execute
   * @param _offerId The Id of the offer
   * @param _offerTokenAmount The amount of offer tokens
   * @param _price The price in base units of the offer tokens
   **/
  function _buy(
    uint256 _offerId,
    uint256 _offerTokenAmount,
    uint256 _price
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
        _offerTokenAmount
      ),
      "transfer is not valid"
    );
    // calculate the price of the order
    uint256 buyerTokenAmount = (_offerTokenAmount * _price) /
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
    offerTokenInterface.transferFrom(
      sellers[_offerId],
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
      oldsellerbalance > offerTokenInterface.balanceOf(sellers[_offerId]),
      "seller error"
    );

    emit OfferAccepted(_offerId, msg.sender, _offerTokenAmount);
  }

  function buy(
    uint256 _offerId,
    uint256 _offerTokenAmount,
    uint256 _price
  ) external override {
    _buy(_offerId, _offerTokenAmount, _price);
  }

  function buyWithPermit(
    uint256 _offerId,
    uint256 _offerTokenAmount,
    uint256 _price,
    uint256 _deadline,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external override {
    IBridgeToken(buyerTokens[_offerId]).permit(
      msg.sender,
      address(this),
      _offerTokenAmount,
      _deadline,
      _v,
      _r,
      _s
    );
    _buy(_offerId, _offerTokenAmount, _price);
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
