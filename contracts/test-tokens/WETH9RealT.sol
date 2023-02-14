// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {WETH9} from "./WETH9.sol";
import {Ownable} from "./Ownable.sol";

contract WETH9RealT is WETH9, Ownable {
	constructor(
		string memory mockName,
		string memory mockSymbol
	) {
		name = mockName;
		symbol = mockSymbol;
	}

	function mint(address account, uint256 value)
		public
		onlyOwner
		returns (bool)
	{
		balanceOf[account] += value;
		emit Transfer(address(0), account, value);
		return true;
	}
}
