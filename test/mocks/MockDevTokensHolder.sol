pragma solidity ^0.4.15;

import '../../contracts/DevTokensHolder.sol';

contract MockDevTokensHolder is DevTokensHolder {
  uint256 public timeStamp;

  function MockDevTokensHolder(address _controller, address _contribution, address _aix)
    DevTokensHolder(_controller, _contribution, _aix)
  {
    timeStamp = now;
  }

  function getTime() internal returns (uint256) {
    return timeStamp;
  }

  function setBlockTimestamp(uint256 _timeStamp) public {
    timeStamp = _timeStamp;
  }
}
