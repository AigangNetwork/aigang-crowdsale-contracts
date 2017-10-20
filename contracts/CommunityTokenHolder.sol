pragma solidity ^0.4.15;

import "./Contribution.sol";
import "./SafeMath.sol";
import "./ERC20.sol";

contract CommunityTokenHolder is Controlled {
  using SafeMath for uint256;

  uint256 public collectedTokens;
  Contribution public contribution;
  ERC20 public aix;

  function CommunityTokenHolder(address _controller, address _contribution, address _aix) {
    controller = _controller;
    contribution = Contribution(_contribution);
    aix = ERC20(_aix);
  }

  /// @notice The Dev (Owner) will call this method to extract the tokens
  function collectTokens() public onlyController {
    uint256 balance = aix.balanceOf(address(this));
    uint256 total = collectedTokens.add(balance);
    // This wallet will get a 29% of the total tokens.
    // since scaling 7 of 29 to a percentage looks horrible (24.1379310344828),
    // I'll use a fraction.
    uint256 canExtract = total.mul(extractableFraction()).div(29);

    canExtract = canExtract.sub(collectedTokens);

    if (canExtract > balance) {
      canExtract = balance;
    }

    collectedTokens = collectedTokens.add(canExtract);
    require(aix.transfer(controller, canExtract));

    TokensWithdrawn(controller, canExtract);
  }

  function extractableFraction() constant returns (uint256) {
    uint256 finalizedTime = contribution.finalizedTime();
    require(finalizedTime > 0);

    uint256 timePassed = getTime().sub(finalizedTime);

    if (timePassed > months(12)) {
      // after a year the full 29% of the total Supply can be collected
      return 29;
    } else {
      // before a year only a 7% of the total Supply can be collected
      return 7;
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
