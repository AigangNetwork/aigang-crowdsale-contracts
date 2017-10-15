pragma solidity ^0.4.11;

import './ERC20.sol';
import "./MiniMeToken.sol";

contract PlaceHolder is Controlled, TokenController {
  bool public transferable;
  MiniMeToken apt;

  function PlaceHolder(address _apt) {
    apt = MiniMeToken(_apt);
  }

  /// @notice Called when `_owner` sends ether to the MiniMe Token contract
  /// @return True if the ether is accepted, false if it throws
  function proxyPayment(address) payable returns (bool) {
    return false;
  }

  /// @notice Notifies the controller about a token transfer allowing the
  ///  controller to react if desired
  /// @return False if the controller does not authorize the transfer
  function onTransfer(address, address, uint256) returns (bool) {
    return transferable;
  }

  /// @notice Notifies the controller about an approval allowing the
  ///  controller to react if desired
  /// @return False if the controller does not authorize the approval
  function onApprove(address, address, uint) returns (bool) {
    return transferable;
  }

  function allowTransfers(bool _transferable) onlyController {
    transferable = _transferable;
  }

  /// @notice Generates `_amount` tokens that are assigned to `_owner`
  /// @param _owner The address that will be assigned the new tokens
  /// @param _amount The quantity of tokens generated
  /// @return True if the tokens are generated correctly
  function generateTokens(address _owner, uint _amount
  ) onlyController returns (bool) {
    return apt.generateTokens(_owner, _amount);
  }

  /// @notice The owner of this contract can change the controller of the APT token
  ///  Please, be sure that the owner is a trusted agent or 0x0 address.
  /// @param _newController The address of the new controller
  function changeAPTController(address _newController) public onlyController {
    apt.changeController(_newController);
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

  event ClaimedTokens(address indexed _token, address indexed _controller, uint256 _amount);
}
