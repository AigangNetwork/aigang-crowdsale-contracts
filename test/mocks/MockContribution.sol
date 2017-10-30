pragma solidity ^0.4.15;

import '../../contracts/Contribution.sol';

contract MockContribution is Contribution {
    uint256 public blockNumber;
    uint256 public timeStamp;

    function MockContribution(address _aix) Contribution(_aix) {
      timeStamp = now;
    }


    function getBlockNumber() internal constant returns (uint256) {
        return blockNumber;
    }

    function getBlockTimestamp() internal constant returns (uint256) {
        return timeStamp;
    }

    function getTimestamp() constant returns (uint256) {
        return getBlockTimestamp();
    }

    function setBlockNumber(uint256 _blockNumber) public {
        blockNumber = _blockNumber;
    }

    function setBlockTimestamp(uint256 _timeStamp) public {
        timeStamp = _timeStamp;
    }
}
