pragma solidity ^0.4.15;

import '../../contracts/RemainderTokenHolder.sol';

contract MockRemainderTokenHolder is RemainderTokenHolder {
  uint256 public timeStamp;

  function MockRemainderTokenHolder(
      address _controller,
      address _contribution,
      address _aix
  ) RemainderTokenHolder(_controller, _contribution, _aix) {
    timeStamp = now;
  }

  function getTime() internal returns (uint256) {
    return timeStamp;
  }

  function setBlockTimestamp(uint256 _timeStamp) public {
    timeStamp = _timeStamp;
  }
}
