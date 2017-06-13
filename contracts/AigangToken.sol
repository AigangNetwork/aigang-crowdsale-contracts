pragma solidity ^0.4.11;


import "./zeppelin/token/StandardToken.sol";


/**
 * @title AigangToken
 *
 * @dev Simple ERC20 Token, with pre-sale logic
 * @dev IMPORTANT NOTE: do not use or deploy this contract as-is. It needs some changes to be 
 * production ready.
 */
contract AigangToken is StandardToken {

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
   * @dev Fallback function which receives ether and sends the appropriate number of tokens to the 
   * msg.sender.
   */
  function () payable {
    purchaseTokens(msg.sender);
  }

  /**
    * @dev Constructor
  */
  function AigangToken() {
    totalSupply = TOTAL_SUPPLY;
    balances[multisigForAig] = TOTAL_SUPPLY - PRE_ICO_SUPPLY;

    // Early investors investable amount in Ethers
    earlyInvestorsEthersCount[0x1] = 10;
    earlyInvestorsEthersCount[0x2] = 20;
    earlyInvestorsEthersCount[0x3] = 10;

    // Extra check if investable amount equals pre ico supply
    if((earlyInvestorsEthersCount[0x1] + 
       earlyInvestorsEthersCount[0x2] +
       earlyInvestorsEthersCount[0x3]) != PRE_ICO_SUPPLY / PRICE) {
      throw;
    }
  }

  /**
   * @dev Creates tokens and send to the specified address.
   * @param recipient The address which will recieve the new tokens.
   */
  function purchaseTokens(address recipient) payable {
    if (msg.value == 0) {
      throw;
    }
    if (msg.value != earlyInvestorsEthersCount[recipient]) {
      throw;
    }

    uint tokens = msg.value.mul(PRICE);

    preIcoTokensLeft = preIcoTokensLeft.sub(tokens);
    balances[recipient] = balances[recipient].add(tokens);

    // Sends money to multisig wallet, in case of failure, reverts
    if (!multisigForEth.send(msg.value)) {
      throw;
    }
  }

  /**
   * @dev replace this with any other price function
   * @return The price per unit of token. 
   */
  function getPrice() constant returns (uint result) {
    return PRICE;
  }
}
