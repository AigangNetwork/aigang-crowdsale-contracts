pragma solidity ^0.4.15;

import "./Contribution.sol";
import "./SafeMath.sol";
import "./ERC20.sol";

contract DevTokensHolder is Controlled {
  using SafeMath for uint256;

  uint256 public collectedTokens;
  Contribution private contribution;
  ERC20 private aix;

  function DevTokensHolder(address _controller, address _contribution, address _aix) {
    controller = _controller;
    contribution = Contribution(_contribution);
    aix = ERC20(_aix);
  }

  /// @notice The Dev (Owner) will call this method to extract the tokens
  function collectTokens() public onlyController {
    uint256 balance = aix.balanceOf(address(this));
    uint256 total = collectedTokens.add(balance);
    uint256 canExtract = total.mul(extractablePercentage()).div(100);

    canExtract = canExtract.sub(collectedTokens);

    if (canExtract > balance) {
      canExtract = balance;
    }

    collectedTokens = collectedTokens.add(canExtract);
    require(aix.transfer(controller, canExtract));

    TokensWithdrawn(controller, canExtract);
  }

  function extractablePercentage() constant public returns (uint256) {
    uint256 finalizedTime = contribution.finalizedTime();
    require(finalizedTime > 0);

    uint256 timePassed = getTime().sub(finalizedTime);

    if (timePassed > months(12)) {
      return 100;
    } else if (timePassed > months(9)) {
      return 75;
    } else if (timePassed > months(6)) {
      return 50;
    } else if (timePassed > months(3)) {
      return 25;
    } else {
      return 0;
    }
  }

  function months(uint256 m) internal returns (uint256) {
    return m.mul(30 days);
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
