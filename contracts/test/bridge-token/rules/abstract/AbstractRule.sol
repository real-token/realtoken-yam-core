/*
    Copyright (c) 2019 Mt Pelerin Group Ltd

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License version 3
    as published by the Free Software Foundation with the addition of the
    following permission added to Section 15 as permitted in Section 7(a):
    FOR ANY PART OF THE COVERED WORK IN WHICH THE COPYRIGHT IS OWNED BY
    MT PELERIN GROUP LTD. MT PELERIN GROUP LTD DISCLAIMS THE WARRANTY OF NON INFRINGEMENT
    OF THIRD PARTY RIGHTS

    This program is distributed in the hope that it will be useful, but
    WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE.
    See the GNU Affero General Public License for more details.
    You should have received a copy of the GNU Affero General Public License
    along with this program; if not, see http://www.gnu.org/licenses or write to
    the Free Software Foundation, Inc., 51 Franklin Street, Fifth Floor,
    Boston, MA, 02110-1301 USA, or download the license from the following URL:
    https://www.gnu.org/licenses/agpl-3.0.fr.html

    The interactive user interfaces in modified source and object code versions
    of this program must display Appropriate Legal Notices, as required under
    Section 5 of the GNU Affero General Public License.

    You can be released from the requirements of the license by purchasing
    a commercial license. Buying such a license is mandatory as soon as you
    develop commercial activities involving Mt Pelerin Group Ltd software without
    disclosing the source code of your own applications.
    These activities include: offering paid services based/using this product to customers,
    using this product in any application, distributing this product with a closed
    source product.

    For more information, please contact Mt Pelerin Group Ltd at this
    address: hello@mtpelerin.com
*/

pragma solidity ^0.8.0;

import "../../interfaces/IRule.sol";

/**
 * @title AbstractRule
 * @dev YesNoRule validates transfer if param _yesNo is more than 0
 * @dev Useful for testing implementation
 *
 * Error messages
 * RU02: Function cannot be called
 *
 */

contract AbstractRule is IRule {

  uint256 internal constant TRANSFER_INVALID = 0;
  uint256 internal constant TRANSFER_VALID_WITH_NO_HOOK = 1;
  uint256 internal constant TRANSFER_VALID_WITH_BEFORE_HOOK = 2;
  uint256 internal constant TRANSFER_VALID_WITH_AFTER_HOOK = 3;

  uint256 internal constant REASON_OK = 0;
  uint256 internal constant REASON_ABSTRACT_RULE = 1;

  /**
  * @dev Validates a transfer
  * @return transferStatus Invalid transfer
  * @return statusCode The reason of the transfer rejection
  */
  function isTransferValid(
    address /* _token */,
    address /* _from */,
    address /* _to */,
    uint256 /* _amount */,
    uint256 /* _param */ )
    public virtual override view returns (uint256, uint256)
  {
    return (TRANSFER_INVALID, REASON_ABSTRACT_RULE);
  }

  /**
  * @dev Dummy before transfer hook
  * @dev Not intended to be called
  * Throws RU02 because this function is not intended to be called
  */
  function beforeTransferHook(
    address /* _token */, address /* _from */, address /* _to */, uint256 /* _amount */, uint256 /* _param */)
    external virtual override returns (uint256, address, uint256)
  {
    revert("RU02");
  }

  /**
  * @dev Dummy after transfer hook
  * @dev Not intended to be called
  * Throws RU02 because this function is not intended to be called
  */
  function afterTransferHook(
    address /* _token */, address /* _from */, address /* _to */, uint256 /* _amount */, uint256 /* _param */)
    external virtual override returns (bool)
  {
    revert("RU02");
  }
}