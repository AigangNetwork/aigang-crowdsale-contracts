pragma solidity ^0.4.15;

/*
  Copyright 2017, Klaus Hott (BlockChainLabs.nz)
  Copyright 2017, Jordi Baylina (Giveth)

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/// @title Exchanger Contract
/// @author Klaus Hott
/// @dev This contract will be used to distribute AIX between APT holders.
///  APT token is not transferable, and we just keep an accounting between all tokens
///  deposited and the tokens collected.

import "./SafeMath.sol";
import "./MiniMeToken.sol";
import "./ERC20.sol";
import "./Contribution.sol";

contract Exchanger is Controlled {
  using SafeMath for uint256;

  mapping (address => uint256) public collected;
  uint256 public totalCollected;
  MiniMeToken public apt;
  MiniMeToken public aix;
  Contribution public contribution;

  function Exchanger(address _apt, address _aix, address _contribution) {
    apt = MiniMeToken(_apt);
    aix = MiniMeToken(_aix);
    contribution = Contribution(_contribution);
  }

  function () public {
    collect();
  }

  /// @notice This method should be called by the APT holders to collect their
  ///  corresponding AIXs
  function collect() public {
    // APT sholder could collect AIX right after contribution started
    assert(getBlockTimestamp() > contribution.startTime());

    uint256 pre_sale_fixed_at = contribution.initializedBlock();

    // Get current APT ballance at contributions initialization-
    uint256 balance = apt.balanceOfAt(msg.sender, pre_sale_fixed_at);

    // total of aix to be distributed.
    uint256 total = totalCollected.add(aix.balanceOf(address(this)));

    // First calculate how much correspond to him
    uint256 amount = total.mul(balance).div(apt.totalSupplyAt(pre_sale_fixed_at));

    // And then subtract the amount already collected
    amount = amount.sub(collected[msg.sender]);

    // Notify the user that there are no tokens to exchange
    require(amount > 0);

    totalCollected = totalCollected.add(amount);
    collected[msg.sender] = collected[msg.sender].add(amount);

    assert(aix.transfer(msg.sender, amount));

    TokensCollected(msg.sender, amount);
  }

  //////////
  // Testing specific methods
  //////////

  /// @notice This function is overridden by the test Mocks.
  function getBlockNumber() internal constant returns (uint256) {
    return block.number;
  }

  /// @notice This function is overridden by the test Mocks.
  function getBlockTimestamp() internal constant returns (uint256) {
    return block.timestamp;
  }

  //////////
  // Safety Method
  //////////

  /// @notice This method can be used by the controller to extract mistakenly
  ///  sent tokens to this contract.
  /// @param _token The address of the token contract that you want to recover
  ///  set to 0 in case you want to extract ether.
  function claimTokens(address _token) public onlyController {
    assert(_token != address(aix));
    if (_token == 0x0) {
      controller.transfer(this.balance);
      return;
    }

    ERC20 token = ERC20(_token);
    uint256 balance = token.balanceOf(this);
    token.transfer(controller, balance);
    ClaimedTokens(_token, controller, balance);
  }

  event ClaimedTokens(address indexed _token, address indexed _controller, uint256 _amount);
  event TokensCollected(address indexed _holder, uint256 _amount);
}
