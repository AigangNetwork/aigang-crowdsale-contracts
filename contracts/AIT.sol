pragma solidity ^0.4.11;


import "./MiniMeToken.sol";


/**
 * @title AigangToken
 *
 * @dev Simple ERC20 Token, with pre-sale logic
 * @dev IMPORTANT NOTE: do not use or deploy this contract as-is. It needs some changes to be
 * production ready.
 */
contract AIT is MiniMeToken {

  string public constant name = "AigangToken";
  string public constant symbol = "AIG";
  uint public constant decimals = 8;
  uint public constant TOTAL_SUPPLY = 10000;
  uint public constant PRE_ICO_SUPPLY = 2000;
  uint public preIcoTokensLeft = PRE_ICO_SUPPLY;

  address public constant multisigForEth = 0x0;
  address public constant multisigForAig = 0x0;

  mapping (address => uint) earlyInvestorsEthersCount;

  // 1 ether = 50 AIG tokens
  uint public constant PRICE = 50;

  /**
    * @dev Constructor
  */
  function AigangToken(address _tokenFactory)
    MiniMeToken(
      _tokenFactory,
      0x0,                     // no parent token
      0,                       // no snapshot block number from parent
      "Aigang Investor Token", // Token name
      18,                      // Decimals
      "AIT",                   // Symbol
      true                     // Enable transfers
    ) {}
}
