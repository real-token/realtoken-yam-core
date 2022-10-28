// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../interfaces/IERC20RealT.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

contract WETHRealT is
  Initializable,
  ERC20Upgradeable,
  ERC20BurnableUpgradeable,
  PausableUpgradeable,
  AccessControlUpgradeable,
  ERC20PermitUpgradeable,
  UUPSUpgradeable,
  IERC20RealT
{
  using SafeERC20Upgradeable for IERC20Upgradeable;

  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

  function initialize() public initializer {
    __ERC20_init("WETH RealT", "WETHRealT");
    __ERC20Burnable_init();
    __Pausable_init();
    __AccessControl_init();
    __ERC20Permit_init("WETH RealT");
    __UUPSUpgradeable_init();

    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(PAUSER_ROLE, msg.sender);
    _mint(msg.sender, 1000000000 * 10**decimals());
    _grantRole(MINTER_ROLE, msg.sender);
    _grantRole(UPGRADER_ROLE, msg.sender);
  }

  function _authorizeUpgrade(address newImplementation)
    internal
    override
    onlyRole(UPGRADER_ROLE)
  {}

  /// @inheritdoc	IERC20RealT
  function decimals()
    public
    pure
    override(ERC20Upgradeable, IERC20RealT)
    returns (uint8)
  {
    return 6;
  }

  /// @inheritdoc	IERC20RealT
  function pause() external override onlyRole(PAUSER_ROLE) {
    _pause();
  }

  /// @inheritdoc	IERC20RealT
  function unpause() external override onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  /// @inheritdoc	IERC20RealT
  function mint(address to, uint256 amount)
    external
    override
    onlyRole(MINTER_ROLE)
  {
    _mint(to, amount);
  }

  /// @inheritdoc	IERC20RealT
  function burnByAdmin(address account, uint256 amount)
    external
    override
    onlyRole(MINTER_ROLE)
  {
    _burn(account, amount);
  }

  /// @inheritdoc	IERC20RealT
  function burnInContract(uint256 amount)
    external
    override
    onlyRole(MINTER_ROLE)
    returns (bool)
  {
    _burn(address(this), amount);
    return true;
  }

  /// @inheritdoc	IERC20RealT
  function saveToken(address token, uint256 amount)
    external
    override
    onlyRole(MINTER_ROLE)
    returns (bool)
  {
    IERC20Upgradeable(token).safeTransfer(_msgSender(), amount);
    return true;
  }

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal override whenNotPaused {
    super._beforeTokenTransfer(from, to, amount);
  }
}
