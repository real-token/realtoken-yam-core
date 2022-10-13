// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { IERC20 } from "./interfaces/IERC20.sol";
import "./interfaces/ISwapCatUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract SwapCatUpgradeable is
  AccessControlUpgradeable,
  UUPSUpgradeable,
  ISwapCatUpgradeable
{
  bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
  bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");

  mapping(uint256 => uint256) internal prices;
  mapping(uint256 => uint256) internal amounts;
  mapping(uint256 => address) internal offerTokens;
  mapping(uint256 => address) internal buyerTokens;
  mapping(uint256 => address) internal sellers;
  mapping(address => bool) internal whitelistedTokens;
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
    _grantRole(MODERATOR_ROLE, moderator_);
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
   * @dev Only moderator or admin can call functions marked by this modifier.
   **/
  modifier onlyModeratorOrAdmin() {
    require(
      hasRole(MODERATOR_ROLE, _msgSender()) ||
        hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
      "caller is not moderator or admin"
    );
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
  function toggleWhitelist(address[] calldata tokens_, bool[] calldata status_)
    external
    override
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    require(tokens_.length == status_.length, "Lengths are not equal");
    uint256 length = tokens_.length;
    for (uint256 i = 0; i < length; ) {
      whitelistedTokens[tokens_[i]] = status_[i];
      ++i;
    }
    emit TokenWhitelistToggled(tokens_, status_);
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function isWhitelisted(address token_) external view override returns (bool) {
    return whitelistedTokens[token_];
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function createOffer(
    address offerToken,
    address buyerToken,
    uint256 price,
    uint256 amount
  ) external override {
    _createOffer(offerToken, buyerToken, price, amount);
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function createOfferWithPermit(
    address offerToken,
    address buyerToken,
    uint256 price,
    uint256 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external override {
    _createOffer(offerToken, buyerToken, price, amount);
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
  function buy(
    uint256 offerId,
    uint256 price,
    uint256 amount
  ) external override {
    _buy(offerId, price, amount);
  }

  /// @inheritdoc	ISwapCatUpgradeable
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
      (uint256(10)**IERC20(offerTokens[offerId]).decimals());
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
  function updateOffer(
    uint256 offerId,
    uint256 price,
    uint256 amount
  ) external override {
    require(sellers[offerId] == msg.sender, "only the seller can change offer");
    emit OfferUpdated(
      offerId,
      prices[offerId],
      price,
      amounts[offerId],
      amount
    );
    prices[offerId] = price;
    amounts[offerId] = amount;
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function deleteOffer(uint256 offerId) external override {
    require(sellers[offerId] == msg.sender, "only the seller can delete offer");
    delete sellers[offerId];
    delete offerTokens[offerId];
    delete buyerTokens[offerId];
    delete prices[offerId];
    delete amounts[offerId];
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
    delete amounts[offerId];
    emit OfferDeleted(offerId);
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function getOfferCount() public view override returns (uint256) {
    return offerCount;
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function tokenInfo(address tokenAddr)
    public
    view
    override
    returns (
      uint256,
      string memory,
      string memory
    )
  {
    IERC20 tokenInterface = IERC20(tokenAddr);
    return (
      tokenInterface.decimals(),
      tokenInterface.symbol(),
      tokenInterface.name()
    );
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function getInitialOffer(uint256 offerId)
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
    return (
      offerTokens[offerId],
      buyerTokens[offerId],
      sellers[offerId],
      prices[offerId],
      amounts[offerId]
    );
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
    IERC20 offerTokenInterface = IERC20(offerTokens[offerId]);

    // get offerTokens balance and allowance, whichever is lower is the available amount
    uint256 availableBalance = offerTokenInterface.balanceOf(sellers[offerId]);
    uint256 availableAllow = offerTokenInterface.allowance(
      sellers[offerId],
      address(this)
    );
    uint256 availableAmount = amounts[offerId];

    if (availableBalance < availableAmount) {
      availableAmount = availableBalance;
    }

    if (availableAllow < availableAmount) {
      availableAmount = availableAllow;
    }

    return (
      offerTokens[offerId],
      buyerTokens[offerId],
      sellers[offerId],
      prices[offerId],
      availableAmount
    );
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function pricePreview(uint256 offerId, uint256 amount)
    public
    view
    override
    returns (uint256)
  {
    IERC20 offerTokenInterface = IERC20(offerTokens[offerId]);
    return
      (amount * prices[offerId]) /
      (uint256(10)**offerTokenInterface.decimals());
  }

  /// @inheritdoc	ISwapCatUpgradeable
  function saveLostTokens(address token)
    external
    override
    onlyModeratorOrAdmin
  {
    IERC20 tokenInterface = IERC20(token);
    tokenInterface.transfer(
      msg.sender,
      tokenInterface.balanceOf(address(this))
    );
  }

  /**
   * @notice Creates a new offer or updates an existing offer (call this again with the changed price + offerId)
   * @param _offerToken The address of the token to be sold
   * @param _buyerToken The address of the token to be bought
   * @param _price The price in base units of the token to be sold
   * @param _amount The amount of tokens to be sold
   **/
  function _createOffer(
    address _offerToken,
    address _buyerToken,
    uint256 _price,
    uint256 _amount
  )
    private
    onlyWhitelistedToken(_offerToken)
    onlyWhitelistedToken(_buyerToken)
  {
    // require(
    //   _isTransferValid(_offerToken, msg.sender, msg.sender, _amount),
    //   "Seller can not transfer tokens"
    // );
    // if no offerId is given a new offer is made, if offerId is given only the offers price is changed if owner matches
    uint256 _offerId = offerCount;
    offerCount++;
    sellers[_offerId] = msg.sender;
    offerTokens[_offerId] = _offerToken;
    buyerTokens[_offerId] = _buyerToken;
    prices[_offerId] = _price;
    amounts[_offerId] = _amount;

    emit OfferCreated(_offerToken, _buyerToken, _offerId, _price, _amount);
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
    address seller = sellers[_offerId];
    address offerToken = offerTokens[_offerId];
    address buyerToken = buyerTokens[_offerId];

    IERC20 offerTokenInterface = IERC20(offerToken);
    IERC20 buyerTokenInterface = IERC20(buyerToken);

    // given price is being checked with recorded data from mappings
    require(prices[_offerId] == _price, "offer price wrong");

    // Check if the transfer is valid
    require(
      _isTransferValid(offerToken, seller, msg.sender, _amount),
      "transfer is not valid"
    );
    // calculate the price of the order
    require(_amount <= amounts[_offerId], "amount too high");
    require(
      _amount * _price > (uint256(10)**offerTokenInterface.decimals()),
      "amount too low"
    );
    uint256 buyerTokenAmount = (_amount * _price) /
      (uint256(10)**offerTokenInterface.decimals());

    // some old erc20 tokens give no return value so we must work around by getting their balance before and after the exchange
    uint256 oldBuyerBalance = buyerTokenInterface.balanceOf(msg.sender);
    uint256 oldSellerBalance = offerTokenInterface.balanceOf(seller);

    // Update amount in mapping
    amounts[_offerId] = amounts[_offerId] - _amount;

    // finally do the exchange
    buyerTokenInterface.transferFrom(msg.sender, seller, buyerTokenAmount);
    offerTokenInterface.transferFrom(seller, msg.sender, _amount);

    // now check if the balances changed on both accounts.
    // we do not check for exact amounts since some tokens behave differently with fees, burnings, etc
    // we assume if both balances are higher than before all is good
    require(
      oldBuyerBalance > buyerTokenInterface.balanceOf(msg.sender),
      "buyer error"
    );
    require(
      oldSellerBalance > offerTokenInterface.balanceOf(seller),
      "seller error"
    );

    emit OfferAccepted(
      _offerId,
      seller,
      msg.sender,
      offerToken,
      buyerToken,
      _price,
      _amount
    );
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
}
