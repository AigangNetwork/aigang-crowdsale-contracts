pragma solidity ^0.4.15;

import '../../contracts/Exchanger.sol';

contract MockExchanger is Exchanger {
  uint256 public timeStamp;

  function MockExchanger(
      address _apt,
      address _aix,
      address _contribution
  ) Exchanger(_apt, _aix, _contribution) {
    timeStamp = now;
  }

  function getBlockTimestamp() internal constant returns (uint256) {
    return timeStamp;
  }

  function setBlockTimestamp(uint256 _timeStamp) public {
    timeStamp = _timeStamp;
  }
}
