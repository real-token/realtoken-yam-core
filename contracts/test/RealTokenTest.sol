// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract RealTokenTest is ERC20, Ownable {
  constructor() ERC20("RealToken", "RTT") {
    _mint(msg.sender, 1000000 * 10**decimals());
  }

  function mint(address to, uint256 amount) public onlyOwner {
    _mint(to, amount);
  }

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal override {
    super._beforeTokenTransfer(from, to, amount);

    console.log("Transferring from %s to %s %s RTT tokens", from, to, amount);
  }

  function msgSender() external view returns (address caller) {
    caller = msg.sender;
    return caller;
  }

  function decimals() public view virtual override returns (uint8) {
    return 18;
  }
}
