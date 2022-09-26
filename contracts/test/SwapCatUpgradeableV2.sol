// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../SwapCatUpgradeable.sol";

contract SwapCatUpgradeableV2 is SwapCatUpgradeable {
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
