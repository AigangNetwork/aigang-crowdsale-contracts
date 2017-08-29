pragma solidity ^0.4.15;

import "./SafeMath.sol";
import "./ERC20.sol";
import "./MiniMeToken.sol";

contract Contribution is Controlled, TokenController {
  using SafeMath for uint256;

  uint256 constant public exchangeRate = 1000; // ETH-AIX exchange rate

  MiniMeToken public aix;
  bool public transferable;
  address public contributionWallet;

  uint256 public totalSupplyCap;            // Total AIX supply to be generated
  uint256 public totalSold;                 // How much tokens have been sold

  uint256 public minimum_investment;

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
      uint256 _totalSupplyCap,
      uint256 _minimum_investment,
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

    assert(_startTime >= getBlockTimestamp());
    require(_startTime < _endTime);
    startTime = _startTime;
    endTime = _endTime;

    require(_totalSupplyCap > 0);
    totalSupplyCap = _totalSupplyCap;

    minimum_investment = _minimum_investment;

    initializedBlock = getBlockNumber();
    initializedTime = getBlockTimestamp();

    require(_apt != 0x0);
    require(_exchanger != 0x0);
    assert(
      // Exchangerate from apt to aix 1250 considering 25% bonus.
      aix.generateTokens(
        _exchanger,
        MiniMeToken(_apt).totalSupplyAt(initializedBlock).mul(1250)
      )
    );

    Initialized(initializedBlock);
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
    require(msg.value >= minimum_investment);

    // Antispam mechanism
    address caller;
    if (msg.sender == address(aix)) {
      caller = _th;
    } else {
      caller = msg.sender;
    }
    assert(!isContract(caller));

    uint256 toFund = msg.value;
    uint256 leftForSale = tokensForSale();
    if (toFund > 0) {
      if (leftForSale > 0) {
        uint256 tokensGenerated = toFund.mul(exchangeRate);

        // Check total supply cap reached, sell the all remaining tokens
        if (tokensGenerated > leftForSale) {
          tokensGenerated = leftForSale;
          toFund = leftForSale.div(exchangeRate);
        }

        assert(aix.generateTokens(_th, tokensGenerated));
        totalSold = totalSold.add(tokensGenerated);

        contributionWallet.transfer(toFund);
        NewSale(_th, toFund, tokensGenerated);
      } else {
        toFund = 0;
      }
    }

    uint256 toReturn = msg.value.sub(toFund);
    if (toReturn > 0) {
      caller.transfer(toReturn);
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
    assert(msg.sender == controller || getBlockTimestamp() > endTime || tokensForSale() == 0);

    finalizedBlock = getBlockNumber();
    finalizedTime = getBlockTimestamp();

    Finalized(finalizedBlock);
  }

  //////////
  // Constant functions
  //////////

  /// @return Total tokens availale for the sale in weis.
  function tokensForSale() public constant returns(uint256) {
    return totalSupplyCap > totalSold ? totalSupplyCap.sub(totalSold) : 0;
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
