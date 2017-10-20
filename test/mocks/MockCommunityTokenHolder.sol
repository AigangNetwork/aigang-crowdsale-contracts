pragma solidity ^0.4.15;

import '../../contracts/CommunityTokenHolder.sol';

contract MockCommunityTokenHolder is CommunityTokenHolder {
  uint256 public timeStamp;

  function MockCommunityTokenHolder(address _controller, address _contribution, address _aix)
    CommunityTokenHolder(_controller, _contribution, _aix)
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
