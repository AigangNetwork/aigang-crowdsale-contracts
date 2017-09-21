pragma solidity ^0.4.15;


import "./MiniMeToken.sol";


/**
 * @title Aigang Pre-Launch Token
 *
 * @dev Simple ERC20 Token, with pre-sale logic
 * @dev IMPORTANT NOTE: do not use or deploy this contract as-is. It needs some changes to be
 * production ready.
 */
contract AIX is MiniMeToken {
  /**
    * @dev Constructor
  */
  function AIX(address _tokenFactory)
    MiniMeToken(
      _tokenFactory,
      0x0,                      // no parent token
      0,                        // no snapshot block number from parent
      "Aigang Network Token",   // Token name
      18,                       // Decimals
      "AIX",                    // Symbol
      true                      // Enable transfers
    ) {}

    function() payable {
      require(false);
    }
}
