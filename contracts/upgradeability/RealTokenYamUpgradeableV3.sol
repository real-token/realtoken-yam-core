// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { IERC20 } from "../interfaces/IERC20.sol";
import "../interfaces/IRealTokenYamUpgradeableV3.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

contract RealTokenYamUpgradeableV3 is
  PausableUpgradeable,
  AccessControlUpgradeable,
  UUPSUpgradeable,
  ReentrancyGuardUpgradeable,
  IRealTokenYamUpgradeableV3
{
  bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
  bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");

  mapping(uint256 => uint256) private prices;
  mapping(uint256 => uint256) private amounts;
  mapping(uint256 => address) private offerTokens;
  mapping(uint256 => address) private buyerTokens;
  mapping(uint256 => address) private sellers;
  mapping(uint256 => address) private buyers;
  mapping(address => TokenType) private tokenTypes;
  uint256 private offerCount;
  uint256 public fee; // fee in basis points
	mapping(uint256 => uint256) private offerBlockNumbers;

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  /// @notice the initialize function to execute only once during the contract deployment
  /// @param admin_ address of the default admin account: whitelist tokens, delete frozen offers, upgrade the contract
  /// @param moderator_ address of the admin with unique responsibles
  function initialize(address admin_, address moderator_) external initializer {
    __AccessControl_init();
    __UUPSUpgradeable_init();

    _grantRole(DEFAULT_ADMIN_ROLE, admin_);
    _grantRole(UPGRADER_ROLE, admin_);
    _grantRole(MODERATOR_ROLE, moderator_);
    __ReentrancyGuard_init();
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
  modifier onlyWhitelistTokenWithType(address token_) {
    require(
      tokenTypes[token_] != TokenType.NOTWHITELISTEDTOKEN,
      "Token is not whitelisted"
    );
    _;
  }

  function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
    _pause();
  }

  function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
    _unpause();
  }

  /// @inheritdoc	IRealTokenYamUpgradeableV3
  function toggleWhitelistWithType(
    address[] calldata tokens_,
    TokenType[] calldata types_
  ) external override onlyRole(DEFAULT_ADMIN_ROLE) {
    uint256 length = tokens_.length;
    require(types_.length == length, "Lengths are not equal");
    for (uint256 i = 0; i < length; ) {
      tokenTypes[tokens_[i]] = types_[i];
      ++i;
    }
    emit TokenWhitelistWithTypeToggled(tokens_, types_);
  }

  /// @inheritdoc	IRealTokenYamUpgradeableV3
  function createOffer(
    address offerToken,
    address buyerToken,
    address buyer,
    uint256 price,
    uint256 amount
  ) public override whenNotPaused {
    // If the offerToken is a RealToken, isTransferValid need to be checked
    if (tokenTypes[offerToken] == TokenType.REALTOKEN) {
      require(
        _isTransferValid(offerToken, msg.sender, msg.sender, amount),
        "Seller can not transfer tokens"
      );
    }
    _createOffer(offerToken, buyerToken, buyer, price, amount);
  }

  /// @inheritdoc	IRealTokenYamUpgradeableV3
  function createOfferWithPermit(
    address offerToken,
    address buyerToken,
    address buyer,
    uint256 price,
    uint256 amount,
    uint256 newAllowance,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external override whenNotPaused {
    // If the offerToken is a RealToken, isTransferValid need to be checked
    if (tokenTypes[offerToken] == TokenType.REALTOKEN) {
      require(
        _isTransferValid(offerToken, msg.sender, msg.sender, amount),
        "Seller can not transfer tokens"
      );
    }

    // Create the offer
    _createOffer(offerToken, buyerToken, buyer, price, amount);

    IBridgeToken(offerToken).permit(
      msg.sender,
      address(this),
      newAllowance,
      deadline,
      v,
      r,
      s
    );
  }

  /// @inheritdoc	IRealTokenYamUpgradeableV3
  function buy(
    uint256 offerId,
    uint256 price,
    uint256 amount
  ) external override whenNotPaused {
    _buy(offerId, price, amount);
  }

  /// @inheritdoc	IRealTokenYamUpgradeableV3
  function buyWithPermit(
    uint256 offerId,
    uint256 price,
    uint256 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external override whenNotPaused {
    // If the offerToken is a RealToken, isTransferValid need to be checked
    if (tokenTypes[offerTokens[offerId]] == TokenType.REALTOKEN) {
      require(
        _isTransferValid(
          offerTokens[offerId],
          sellers[offerId],
          msg.sender,
          amount
        ),
        "transfer is not valid"
      );
    }

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

  /// @inheritdoc	IRealTokenYamUpgradeableV3
  function updateOffer(
    uint256 offerId,
    uint256 price,
    uint256 amount
  ) external override whenNotPaused {
    _updateOffer(offerId, price, amount);
  }

  /// @inheritdoc	IRealTokenYamUpgradeableV3
  function updateOfferWithPermit(
    uint256 offerId,
    uint256 price,
    uint256 amount,
    uint256 newAllowance,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external override whenNotPaused {
    IBridgeToken(offerTokens[offerId]).permit(
      msg.sender,
      address(this),
      newAllowance,
      deadline,
      v,
      r,
      s
    );
    // Then update the offer
    _updateOffer(offerId, price, amount);
  }

  /// @inheritdoc	IRealTokenYamUpgradeableV3
  function deleteOffer(uint256 offerId) public override whenNotPaused {
    require(sellers[offerId] == msg.sender, "only the seller can delete offer");
    _deleteOffer(offerId);
  }

  /// @inheritdoc	IRealTokenYamUpgradeableV3
  function deleteOfferBatch(uint256[] calldata offerIds)
    external
    override
    whenNotPaused
  {
    uint256 length = offerIds.length;
    for (uint256 i = 0; i < length; ) {
      deleteOffer(offerIds[i]);
      ++i;
    }
  }

  /// @inheritdoc	IRealTokenYamUpgradeableV3
  function deleteOfferByAdmin(uint256[] calldata offerIds)
    external
    override
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    uint256 length = offerIds.length;
    for (uint256 i = 0; i < length; ) {
      _deleteOffer(offerIds[i]);
      ++i;
    }
  }

  /// @inheritdoc	IRealTokenYamUpgradeableV3
  function getOfferCount() external view override returns (uint256) {
    return offerCount;
  }

  /// @inheritdoc	IRealTokenYamUpgradeableV3
  function getTokenType(address token)
    external
    view
    override
    returns (TokenType)
  {
    return tokenTypes[token];
  }

  /// @inheritdoc	IRealTokenYamUpgradeableV3
  function tokenInfo(address tokenAddr)
    external
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

  /// @inheritdoc	IRealTokenYamUpgradeableV3
  function getInitialOffer(uint256 offerId)
    external
    view
    override
    returns (
      address,
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
      buyers[offerId],
      prices[offerId],
      amounts[offerId]
    );
  }

  /// @inheritdoc	IRealTokenYamUpgradeableV3
  function showOffer(uint256 offerId)
    external
    view
    override
    returns (
      address,
      address,
      address,
      address,
      uint256,
      uint256
    )
  {
    // get offerTokens balance and allowance, whichever is lower is the available amount
    uint256 availableBalance = IERC20(offerTokens[offerId]).balanceOf(
      sellers[offerId]
    );
    uint256 availableAllow = IERC20(offerTokens[offerId]).allowance(
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
      buyers[offerId],
      prices[offerId],
      availableAmount
    );
  }

  /// @inheritdoc	IRealTokenYamUpgradeableV3
  function pricePreview(uint256 offerId, uint256 amount)
    external
    view
    override
    returns (uint256)
  {
    IERC20 offerTokenInterface = IERC20(offerTokens[offerId]);
    return
      (amount * prices[offerId]) /
      (uint256(10)**offerTokenInterface.decimals());
  }

  /// @inheritdoc	IRealTokenYamUpgradeableV3
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

  /// @inheritdoc	IRealTokenYamUpgradeableV3
  function setFee(uint256 fee_) external override onlyRole(DEFAULT_ADMIN_ROLE) {
    emit FeeChanged(fee, fee_);
    fee = fee_;
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
    address _buyer,
    uint256 _price,
    uint256 _amount
  )
    private
    onlyWhitelistTokenWithType(_offerToken)
    onlyWhitelistTokenWithType(_buyerToken)
  {
    // if no offerId is given a new offer is made, if offerId is given only the offers price is changed if owner matches
    uint256 _offerId = offerCount;
    offerCount++;
    if (_buyer != address(0)) {
      buyers[_offerId] = _buyer;
    }
    sellers[_offerId] = msg.sender;
    offerTokens[_offerId] = _offerToken;
    buyerTokens[_offerId] = _buyerToken;
    prices[_offerId] = _price;
    amounts[_offerId] = _amount;
		offerBlockNumbers[_offerId] = block.number;

		emit OfferCreated(
      _offerToken,
      _buyerToken,
      msg.sender,
      _buyer,
      _offerId,
      _price,
      _amount
    );
  }

  /**
   * @notice Creates a new offer or updates an existing offer (call this again with the changed price + offerId)
   * @param _offerId The address of the token to be sold
   * @param _price The address of the token to be bought
   * @param _amount The price in base units of the token to be sold
   **/
  function _updateOffer(
    uint256 _offerId,
    uint256 _price,
    uint256 _amount
  ) private {
    require(
      sellers[_offerId] == msg.sender,
      "only the seller can change offer"
    );
    emit OfferUpdated(
      _offerId,
      prices[_offerId],
      _price,
      amounts[_offerId],
      _amount
    );
    prices[_offerId] = _price;
    amounts[_offerId] = _amount;
  }

  /**
   * @notice Deletes an existing offer
   * @param _offerId The Id of the offer to be deleted
   **/
  function _deleteOffer(uint256 _offerId) private {
    delete sellers[_offerId];
    delete buyers[_offerId];
    delete offerTokens[_offerId];
    delete buyerTokens[_offerId];
    delete prices[_offerId];
    delete amounts[_offerId];
    emit OfferDeleted(_offerId);
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
    if (buyers[_offerId] != address(0)) {
      require(buyers[_offerId] == msg.sender, "private offer");
    }

    address seller = sellers[_offerId];
    address offerToken = offerTokens[_offerId];
    address buyerToken = buyerTokens[_offerId];

    IERC20 offerTokenInterface = IERC20(offerToken);
    IERC20 buyerTokenInterface = IERC20(buyerToken);

		// Check if the offer is validated in the last block
		require(
			block.number > offerBlockNumbers[_offerId],
			"can not buy in the same block as offer creation"
		);

    // given price is being checked with recorded data from mappings
    require(prices[_offerId] == _price, "offer price wrong");

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

  /// @inheritdoc	IRealTokenYamUpgradeableV3
  function createOfferBatch(
    address[] calldata _offerTokens,
    address[] calldata _buyerTokens,
    address[] calldata _buyers,
    uint256[] calldata _prices,
    uint256[] calldata _amounts
  ) external override whenNotPaused {
    uint256 length = _offerTokens.length;
    require(
      _buyerTokens.length == length &&
        _buyers.length == length &&
        _prices.length == length &&
        _amounts.length == length,
      "length mismatch"
    );
    for (uint256 i = 0; i < length; ) {
      createOffer(
        _offerTokens[i],
        _buyerTokens[i],
        _buyers[i],
        _prices[i],
        _amounts[i]
      );
      ++i;
    }
  }

  /// @inheritdoc	IRealTokenYamUpgradeableV3
  function updateOfferBatch(
    uint256[] calldata _offerIds,
    uint256[] calldata _prices,
    uint256[] calldata _amounts
  ) external override whenNotPaused {
    uint256 length = _offerIds.length;
    require(
      _prices.length == length && _amounts.length == length,
      "length mismatch"
    );
    for (uint256 i = 0; i < length; ) {
      _updateOffer(_offerIds[i], _prices[i], _amounts[i]);
      ++i;
    }
  }

  /// @inheritdoc	IRealTokenYamUpgradeableV3
  function buyOfferBatch(
    uint256[] calldata _offerIds,
    uint256[] calldata _prices,
    uint256[] calldata _amounts
  ) external override whenNotPaused {
    uint256 length = _offerIds.length;
    require(
      _prices.length == length && _amounts.length == length,
      "length mismatch"
    );
    for (uint256 i = 0; i < length; ) {
      _buy(_offerIds[i], _prices[i], _amounts[i]);
      ++i;
    }
  }
}
