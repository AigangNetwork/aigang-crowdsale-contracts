const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
const AIX = artifacts.require("AIX");
const PlaceHolder = artifacts.require("PlaceHolder");
const SafeMath = artifacts.require("SafeMath");
const PreSale = artifacts.require("PreSale");
const Contribution = artifacts.require("Contribution");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const Exchanger = artifacts.require('Exchanger');
const abiEncoder = require('ethereumjs-abi');

function latestTime() {
  return web3.eth.getBlock('latest').timestamp;
}
const BigNumber = web3.BigNumber;

const duration = {
  seconds: function(val) { return val},
  minutes: function(val) { return val * this.seconds(60) },
  hours:   function(val) { return val * this.minutes(60) },
  days:    function(val) { return val * this.hours(24) },
  weeks:   function(val) { return val * this.days(7) },
  years:   function(val) { return val * this.days(365)} 
};

module.exports = function(deployer, chain, accounts) {
  return deployer.deploy(SafeMath).then(async () => {
    await deployer.deploy(MiniMeTokenFactory);
    const tokenFactory = await MiniMeTokenFactory.deployed();
    await deployer.deploy(AIX, tokenFactory.address);
    const aix = await AIX.deployed();
    await deployer.deploy(Contribution, aix.address);
    const contribution = await Contribution.deployed();
    await aix.changeController(contribution.address);
    await deployMultisig(deployer, accounts);
    const multiSig = await MultiSigWallet.deployed();

    const APT_TOKEN_ADDRESS = "0x23aE3C5B39B12f0693e05435EeaA1e51d8c61530"; 
    await deployer.deploy(Exchanger, APT_TOKEN_ADDRESS, aix.address, contribution.address);
    const exchanger = await Exchanger.deployed();

    const totalCap = new BigNumber(10**18 * 1000);
    const minimum = new BigNumber(10**18 * 1);
    const startTime = latestTime() + duration.minutes(5);
    const endTime = latestTime() + duration.weeks(5);
    // address _apt,
    // address _exchanger,
    // address _contributionWallet,
    // uint256 _totalSupplyCap,
    // uint256 _minimum_investment,
    // uint256 _startTime,
    // uint256 _endTime
    const values = [aix.address, exchanger.address, multiSig.address, totalCap.toString(10), minimum.toString(10), startTime, endTime];

    const encodedParams = abiEncoder.rawEncode(['address', 'address', 'address', 'uint256', 'uint256', 'uint256', 'uint256'], values);
    console.log('*******ENCODED PARAMS: ******\n');
    console.log('encodedParams', encodedParams.toString('hex'));
    await contribution.initialize(aix.address, exchanger.address, multiSig.address, totalCap,
      minimum, startTime, endTime
    )
  });
};


async function deployMultisig(deployer, accounts) {
  const owner1 = accounts[0];
  const owner2 = accounts[1];
  const numRequiredSignatures = 1;
  return deployer.deploy(MultiSigWallet, [owner1, owner2], 1);
}