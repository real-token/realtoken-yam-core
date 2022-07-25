// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISwapCatUpgradeable {
  /**
   * @dev Emitted after an offer is created
   * @param offerToken the token you want to sell
   * @param buyerToken the token you want to buy
   * @param price the price in baseunits of the token you want to sell
   * @param offerId the Id of the offer
   **/
  event OfferCreated(
    address indexed offerToken,
    address indexed buyerToken,
    uint256 price,
    uint256 indexed offerId
  );

  /**
   * @dev Emitted after an offer is deleted
   * @param offerId the Id of the offer to be deleted
   **/
  event OfferDeleted(uint256 indexed offerId);

  /**
   * @dev Emitted after an offer is accepted
   * @param offerId The Id of the offer that was accepted
   * @param buyer the address of the buyer
   * @param amount the amount of tokens that the buyer bought
   **/
  event OfferAccepted(
    uint256 indexed offerId,
    address indexed buyer,
    uint256 indexed amount
  );

  /**
   * @dev Emitted after a token is whitelisted
   * @param token the token address that is whitelisted
   **/
  event TokenWhitelisted(address indexed token);

  /**
   * @dev Emitted after a token is unwhitelisted
   * @param token the token address that is unwhitelisted
   **/
  event TokenUnWhitelisted(address indexed token);

  /**
   * @notice Creates a new offer or updates an existing offer (call this again with the changed price + offerId)
   * @param offerToken The address of the token to be sold
   * @param buyerToken The address of the token to be bought
   * @param price The price in base units of the token to be sold
   * @param offerId The Id of the offer (0 if new offer)
   * @return offerId The Id of the offer
   **/
  function createOffer(
    address offerToken,
    address buyerToken,
    uint256 price,
    uint256 offerId
  ) external returns (uint256);

  /**
   * @notice Deletes an existing offer, only the seller of the offer can do this
   * @param offerId The Id of the offer to be deleted
   **/
  function deleteOffer(uint256 offerId) external;

  /**
   * @notice Accepts an existing offer
   * @notice The buyer must bring the price correctly to ensure no frontrunning / changed offer
   * @notice If the offer is changed in meantime, it will not execute
   * @param offerId The Id of the offer
   * @param amount The amount of offer tokens
   * @param price The price in base units of the offer tokens
   **/
  function buy(
    uint256 offerId,
    uint256 amount,
    uint256 price
  ) external;

  /**
   * @notice Returns the offer count
   * @return offerCount The offer count
   **/
  function getOfferCount() external view returns (uint256);

  /**
   * @notice Returns the token information: decimals, symbole, name
   * @param tokenAddress The address of the reference asset of the distribution
   * @return The decimals of the token
   * @return The symbol  of the token
   * @return The name of the token
   **/
  function tokenInfo(address tokenAddress)
    external
    view
    returns (
      uint256,
      string memory,
      string memory
    );

  /**
   * @notice Returns the offer information
   * @param offerId The offer Id
   * @return The offer token address
   * @return The buyer token address
   * @return The seller address
   * @return The price
   * @return The available balance
   **/
  function showOffer(uint256 offerId)
    external
    view
    returns (
      address,
      address,
      address,
      uint256,
      uint256
    );

  /**
   * @notice Returns price in buyertokens for the specified amount of offertokens
   * @param offerId The offer Id
   * @param amount The amount of offer tokens
   * @return The total amount to pay
   **/
  function pricePreview(uint256 offerId, uint256 amount)
    external
    view
    returns (uint256);

  /**
   * @notice Whitelist or unwhitelist a token
   * @param token The token address
   **/
  function toggleWhitelist(address token) external;

  /**
   * @notice Returns whether the token is whitelisted
   * @param token The token address
   * @return true if the token is whitelisted, false otherwise
   **/
  function isWhitelisted(address token) external view returns (bool);
}
