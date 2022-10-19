//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

interface IERC20RealT is IERC20Upgradeable {
  function decimals() external view returns (uint8);

  function pause() external;

  function unpause() external;

  function mint(address to, uint256 amount) external;

  function burnByAdmin(address account, uint256 amount) external;

  function burnInContract(uint256 amount) external returns (bool);

  function saveToken(address token, uint256 amount) external returns (bool);
}
