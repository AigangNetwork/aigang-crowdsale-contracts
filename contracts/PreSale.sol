pragma solidity ^0.4.11;

import "./SafeMath.sol";
import "./ERC20.sol";
import "./MiniMeToken.sol";

contract PreSale is Controlled, TokenController {
  using SafeMath for uint256;

  uint256 constant public exchangeRate = 1; // ETH-APT exchange rate
  uint256 constant public investor_bonus = 25;

  MiniMeToken public apt;
  address public place_holder;
  address public preSaleWallet;

  uint256 public totalSupplyCap;            // Total APT supply to be generated
  uint256 public totalSold;                 // How much tokens have been sold

  uint256 public minimum_investment;

  uint256 public startBlock;
  uint256 public endBlock;

  uint256 public initializedBlock;
  uint256 public finalizedBlock;

  bool public paused;

  modifier initialized() {
    assert(initializedBlock != 0);
    _;
  }

  modifier contributionOpen() {
    assert(getBlockNumber() >= startBlock &&
           getBlockNumber() <= endBlock &&
           finalizedBlock == 0);
    _;
  }

  modifier notPaused() {
    require(!paused);
    _;
  }

  function PreSale(address _apt, address _place_holder) {
    require(_apt != 0x0);
    require(_place_holder != 0x0);
    apt = MiniMeToken(_apt);
    place_holder = _place_holder;
  }

  function initialize(
      address _preSaleWallet,
      uint256 _totalSupplyCap,
      uint256 _minimum_investment,
      uint256 _startBlock,
      uint256 _endBlock
  ) public onlyController {
    // Initialize only once
    require(initializedBlock == 0);

    assert(apt.totalSupply() == 0);
    assert(apt.controller() == address(this));
    assert(apt.decimals() == 18);  // Same amount of decimals as ETH

    require(_preSaleWallet != 0x0);
    preSaleWallet = _preSaleWallet;

    assert(_startBlock >= getBlockNumber());
    require(_startBlock < _endBlock);
    startBlock = _startBlock;
    endBlock = _endBlock;

    require(_totalSupplyCap > 0);
    totalSupplyCap = _totalSupplyCap;

    minimum_investment = _minimum_investment;

    initializedBlock = getBlockNumber();
    Initialized(initializedBlock);
  }

  /// @notice If anybody sends Ether directly to this contract, consider he is
  /// getting APTs.
  function () public payable notPaused {
    proxyPayment(msg.sender);
  }

  //////////
  // TokenController functions
  //////////

  /// @notice This method will generally be called by the APT token contract to
  ///  acquire APTs. Or directly from third parties that want to acquire APTs in
  ///  behalf of a token holder.
  /// @param _th APT holder where the APTs will be minted.
  function proxyPayment(address _th) public payable notPaused initialized contributionOpen returns (bool) {
    require(_th != 0x0);
    doBuy(_th);
    return true;
  }

  function onTransfer(address, address, uint256) public returns (bool) {
    return false;
  }

  function onApprove(address, address, uint256) public returns (bool) {
    return false;
  }

  function doBuy(address _th) internal {
    require(msg.value >= minimum_investment);

    // Antispam mechanism
    address caller;
    if (msg.sender == address(apt)) {
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

        assert(apt.generateTokens(_th, tokensGenerated));
        totalSold = totalSold.add(tokensGenerated);

        preSaleWallet.transfer(toFund);
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
  ///  end or by anybody after the `endBlock`. This method finalizes the contribution period
  ///  by creating the remaining tokens and transferring the controller to the configured
  ///  controller.
  function finalize() public initialized {
    require(finalizedBlock == 0);
    assert(getBlockNumber() >= startBlock);
    assert(msg.sender == controller || getBlockNumber() > endBlock || tokensForSale() == 0);

    apt.changeController(place_holder);

    finalizedBlock = getBlockNumber();

    Finalized(finalizedBlock);
  }

  //////////
  // Constant functions
  //////////

  /// @return Total tokens availale for the sale in weis.
  function tokensForSale() public constant returns(uint256) {
    return totalSupplyCap > totalSold ? totalSupplyCap - totalSold : 0;
  }

  //////////
  // Testing specific methods
  //////////

  /// @notice This function is overridden by the test Mocks.
  function getBlockNumber() internal constant returns (uint256) {
    return block.number;
  }


  //////////
  // Safety Methods
  //////////

  /// @notice This method can be used by the controller to extract mistakenly
  ///  sent tokens to this contract.
  /// @param _token The address of the token contract that you want to recover
  ///  set to 0 in case you want to extract ether.
  function claimTokens(address _token) public onlyController {
    if (apt.controller() == address(this)) {
      apt.claimTokens(_token);
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
