// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "hardhat/console.sol";

contract HardhatTokenUpgradeable is
    UUPSUpgradeable,
    ERC20Upgradeable,
    OwnableUpgradeable
{
    function initialize() external initializer {
        __UUPSUpgradeable_init();
        __ERC20_init("HardhatToken", "HT");
        __Ownable_init();
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._beforeTokenTransfer(from, to, amount);

        console.log("Transferring from %s to %s %s tokens", from, to, amount);
    }

    function msgSender() external view returns (address caller) {
        caller = msg.sender;
        return caller;
    }
}
