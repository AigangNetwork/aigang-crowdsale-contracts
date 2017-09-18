pragma solidity ^0.4.15;

import "./SafeMath.sol";
import "./ERC20.sol";
import "./MiniMeToken.sol";

contract Contribution is Controlled, TokenController {
  using SafeMath for uint256;

  MiniMeToken public aix;
  bool public transferable;
  address public contributionWallet;
  address public remainderHolder;
  address public devHolder;
  address public communityHolder;

  uint256 public totalEthCap;             // Total ETH to be collected
  uint256 public totalEthCollected;       // How much ETH has been collected
  uint256 public ethPreCollected;

  uint256 public numWhitelistedInvestors;
  mapping (address => bool) public canPurchase;
  mapping (address => uint256) public individualEthCollected;

  uint256 public startTime;
  uint256 public endTime;

  uint256 public initializedTime;
  uint256 public finalizedTime;

  uint256 public initializedBlock;
  uint256 public finalizedBlock;

  bool public paused;

  modifier initialized() {
    assert(initializedBlock != 0);
    _;
  }

  modifier contributionOpen() {
    assert(getBlockTimestamp() >= startTime &&
           getBlockTimestamp() <= endTime &&
           finalizedTime == 0);
    _;
  }

  modifier notPaused() {
    require(!paused);
    _;
  }

  function Contribution(address _aix) {
    require(_aix != 0x0);
    aix = MiniMeToken(_aix);
  }

  function initialize(
      address _apt,
      address _exchanger,
      address _contributionWallet,
      address _remainderHolder,
      address _devHolder,
      address _communityHolder,
      uint256 _totalEthCap,
      uint256 _startTime,
      uint256 _endTime
  ) public onlyController {
    // Initialize only once
    require(initializedBlock == 0);
    require(initializedTime == 0);
    assert(aix.totalSupply() == 0);
    assert(aix.controller() == address(this));
    assert(aix.decimals() == 18);  // Same amount of decimals as ETH

    require(_contributionWallet != 0x0);
    contributionWallet = _contributionWallet;

    require(_remainderHolder != 0x0);
    remainderHolder = _remainderHolder;

    require(_devHolder != 0x0);
    devHolder = _devHolder;

    require(_communityHolder != 0x0);
    communityHolder = _communityHolder;

    assert(_startTime >= getBlockTimestamp());
    require(_startTime < _endTime);
    startTime = _startTime;
    endTime = _endTime;

    require(_totalEthCap > 0);
    totalEthCap = _totalEthCap;

    initializedBlock = getBlockNumber();
    initializedTime = getBlockTimestamp();

    require(_apt != 0x0);
    require(_exchanger != 0x0);

    ethPreCollected = MiniMeToken(_apt).totalSupplyAt(initializedBlock);
    totalEthCollected = totalEthCollected.add(ethPreCollected);

    // Exchangerate from apt to aix 1250 considering 25% bonus.
    assert(aix.generateTokens(_exchanger, ethPreCollected.mul(1250)));

    Initialized(initializedBlock);
  }

  /// @notice interface for founders to blacklist investors
  /// @param _investors array of investors
  function blacklistAddresses(address[] _investors) public onlyController {
    for (uint256 i = 0; i < _investors.length; i++) {
      address investorAddress = _investors[i];
      if(!canPurchase[investorAddress]) {
        continue;
      }
      canPurchase[investorAddress] = false;
      numWhitelistedInvestors--;
    }
  }

  /// @notice interface for founders to whitelist investors
  /// @param _investors array of investors
  function whitelistAddresses(address[] _investors) public onlyController {
    for (uint256 i = 0; i < _investors.length; i++) {
      address investorAddress = _investors[i];
      if(canPurchase[investorAddress]) {
        continue;
      }
      canPurchase[investorAddress] = true;
      numWhitelistedInvestors++;
    }
  }

  function whitelist(address investor) public onlyController {
    if (canPurchase[investor]) return;
    numWhitelistedInvestors++;
    canPurchase[investor] = true;
  }

  function blacklist(address investor) public onlyController {
    if (!canPurchase[investor]) return;
    numWhitelistedInvestors--;
    canPurchase[investor] = false;
  }

  // ETH-AIX exchange rate
  function exchangeRate() constant public initialized returns (uint256 rate) {
    if (getBlockTimestamp() <= startTime + 1 hours) {
      // 12% discount
      // 0.88 ETH ≈ 1000 AIX
      rate = 1136;
    } else if (getBlockTimestamp() <= startTime + 2 hours) {
      // 6% discount
      // 0.94 ETH ≈ 1000 AIX
      rate = 1064;
    } else {
      rate = 1000;
    }
  }

  /// @notice If anybody sends Ether directly to this contract, consider he is
  /// getting AIXs.
  function () public payable notPaused {
    proxyPayment(msg.sender);
  }

  //////////
  // TokenController functions
  //////////

  /// @notice This method will generally be called by the AIX token contract to
  ///  acquire AIXs. Or directly from third parties that want to acquire AIXs in
  ///  behalf of a token holder.
  /// @param _th AIX holder where the AIXs will be minted.
  function proxyPayment(address _th) public payable notPaused initialized contributionOpen returns (bool) {
    require(_th != 0x0);
    doBuy(_th);
    return true;
  }

  function onTransfer(address, address, uint256) public returns (bool) {
    return transferable;
  }

  function onApprove(address, address, uint256) public returns (bool) {
    return transferable;
  }

  function allowTransfers(bool _transferable) onlyController {
    transferable = _transferable;
  }

  function doBuy(address _th) internal {
    require(canPurchase[_th]);

    uint256 toFund = msg.value;
    uint256 toCollect = ethToCollect(_th);

    if (toCollect > 0) {
      // Check total supply cap reached, sell the all remaining tokens
      if (toFund > toCollect) {
        toFund = toCollect;
      }
      uint256 tokensGenerated = toFund.mul(exchangeRate());
      require(tokensGenerated > 0);
      require(aix.generateTokens(_th, tokensGenerated));

      contributionWallet.transfer(toFund);
      individualEthCollected[_th] = individualEthCollected[_th].add(toFund);
      totalEthCollected = totalEthCollected.add(toFund);
      NewSale(_th, toFund, tokensGenerated);
    } else {
      toFund = 0;
    }

    uint256 toReturn = msg.value.sub(toFund);
    if (toReturn > 0) {
      _th.transfer(toReturn);
    }
  }

  /// @dev Internal function to determine if an address is a contract
  /// @param _addr The address being queried
  /// @return True if `_addr` is a contract
  function isContract(address _addr) constant internal returns (bool) {
    if (_addr == 0) return false;
    uint256 size;
    assembly {
      size := extcodesize(_addr)
    }
    return (size > 0);
  }

  /// @notice This method will can be called by the controller before the contribution period
  ///  end or by anybody after the `endTime`. This method finalizes the contribution period
  ///  by creating the remaining tokens and transferring the controller to the configured
  ///  controller.
  function finalize() public initialized {
    require(finalizedBlock == 0);
    require(finalizedTime == 0);
    assert(getBlockTimestamp() >= startTime);
    assert(msg.sender == controller || getBlockTimestamp() > endTime || ethToCollect() == 0);

    // remainder will be minted and locked for 1 year.
    aix.generateTokens(remainderHolder, ethToCollect().mul(1000));
    // AIX generated so far is 51% of total
    uint256 tokenCap = aix.totalSupply().mul(100).div(51);
    // dev Wallet will have 20% of the total Tokens and will be able to retrieve quarterly.
    aix.generateTokens(devHolder, tokenCap.mul(20).div(100));
    // community Wallet will have access to 29% of the total Tokens.
    aix.generateTokens(communityHolder, tokenCap.mul(29).div(100));

    finalizedBlock = getBlockNumber();
    finalizedTime = getBlockTimestamp();

    Finalized(finalizedBlock);
  }

  //////////
  // Constant functions
  //////////

  /// @return Total eth that still available for collection in weis.
  function ethToCollect() public constant returns(uint256) {
    return totalEthCap > totalEthCollected ? totalEthCap.sub(totalEthCollected) : 0;
  }

  /// @return Total eth that still available for collection in weis.
  function ethToCollect(address investor) public constant returns(uint256) {
    uint256 cap;
    uint256 collected;
    // adding 1 day as a placeholder for X hours.
    // This should change into a variable or coded into the contract.
    if (getBlockTimestamp() <= startTime + 1 days) {
      cap = totalEthCap.sub(ethPreCollected).div(numWhitelistedInvestors);
      collected = individualEthCollected[investor];
    } else {
      cap = totalEthCap;
      collected = totalEthCollected;
    }
    return cap > collected ? cap.sub(collected) : 0;
  }

  //////////
  // Testing specific methods
  //////////

  /// @notice This function is overridden by the test Mocks.
  function getBlockNumber() internal constant returns (uint256) {
    return block.number;
  }

  function getBlockTimestamp() internal constant returns (uint256) {
    return block.timestamp;
  }



  //////////
  // Safety Methods
  //////////

  /// @notice This method can be used by the controller to extract mistakenly
  ///  sent tokens to this contract.
  /// @param _token The address of the token contract that you want to recover
  ///  set to 0 in case you want to extract ether.
  function claimTokens(address _token) public onlyController {
    if (aix.controller() == address(this)) {
      aix.claimTokens(_token);
    }

    if (_token == 0x0) {
      controller.transfer(this.balance);
      return;
    }

    ERC20 token = ERC20(_token);
    uint256 balance = token.balanceOf(this);
    token.transfer(controller, balance);
    ClaimedTokens(_token, controller, balance);
  }

  /// @notice Pauses the contribution if there is any issue
  function pauseContribution(bool _paused) onlyController {
    paused = _paused;
  }

  event ClaimedTokens(address indexed _token, address indexed _controller, uint256 _amount);
  event NewSale(address indexed _th, uint256 _amount, uint256 _tokens);
  event Initialized(uint _now);
  event Finalized(uint _now);
}
