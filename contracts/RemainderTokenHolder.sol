pragma solidity ^0.4.15;

import "./Contribution.sol";
import "./SafeMath.sol";
import "./ERC20.sol";

contract RemainderTokenHolder is Controlled {
  using SafeMath for uint256;

  Contribution private contribution;
  ERC20 private aix;

  function RemainderTokenHolder(address _controller, address _contribution, address _aix) {
    controller = _controller;
    contribution = Contribution(_contribution);
    aix = ERC20(_aix);
  }

  /// @notice The Dev (Owner) will call this method to extract the tokens
  function collectTokens() public onlyController {
    uint256 finalizedTime = contribution.finalizedTime();
    require(finalizedTime > 0 && getTime() > finalizedTime.add(1 years));

    uint256 balance = aix.balanceOf(address(this));
    require(aix.transfer(controller, balance));
    TokensWithdrawn(controller, balance);
  }

  function getTime() internal returns (uint256) {
    return now;
  }

  //////////
  // Safety Methods
  //////////

  /// @notice This method can be used by the controller to extract mistakenly
  ///  sent tokens to this contract.
  /// @param _token The address of the token contract that you want to recover
  ///  set to 0 in case you want to extract ether.
  function claimTokens(address _token) public onlyController {
    require(_token != address(aix));
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
  event TokensWithdrawn(address indexed _holder, uint256 _amount);
}
