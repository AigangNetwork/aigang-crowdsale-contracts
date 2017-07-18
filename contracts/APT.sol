pragma solidity ^0.4.11;


import "./MiniMeToken.sol";


/**
 * @title Aigang Pre-Launch Token
 *
 * @dev Simple ERC20 Token, with pre-sale logic
 * @dev IMPORTANT NOTE: do not use or deploy this contract as-is. It needs some changes to be
 * production ready.
 */
contract APT is MiniMeToken {
  /**
    * @dev Constructor
  */
  function APT(address _tokenFactory)
    MiniMeToken(
      _tokenFactory,
      0x0,                      // no parent token
      0,                        // no snapshot block number from parent
      "Aigang Pre-Launch Token", // Token name
      18,                       // Decimals
      "APT",                    // Symbol
      true                      // Enable transfers
    ) {}
}
