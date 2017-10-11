const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
const AIX = artifacts.require("AIX");
const PlaceHolder = artifacts.require("PlaceHolder");
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
  seconds: function(val) { return val },
  minutes: function(val) { return val * this.seconds(60) },
  hours:   function(val) { return val * this.minutes(60) },
  days:    function(val) { return val * this.hours(24) },
  weeks:   function(val) { return val * this.days(7) },
  years:   function(val) { return val * this.days(365) }
};

module.exports = function(deployer, chain, accounts) {
  return deployer.deploy(MiniMeTokenFactory).then(async () => {
    const tokenFactory = await MiniMeTokenFactory.deployed();
    const encodedParamsAIX = abiEncoder.rawEncode(['address'], [tokenFactory.address]);
    await deployer.deploy(AIX, tokenFactory.address);
    console.log('ENCODED PARAMS AIX: \n', encodedParamsAIX.toString('hex'));

    const aix = await AIX.deployed();
    const encodedParamsContribution = abiEncoder.rawEncode(['address'], [aix.address]);
    await deployer.deploy(Contribution, aix.address);
    console.log('CONTRIBUTION ENCODED: \n', encodedParamsContribution.toString('hex'));

    const contribution = await Contribution.deployed();
    await aix.changeController(contribution.address);
    await deployMultisig(deployer, accounts);
    const multiSig = await MultiSigWallet.deployed();

    const APT_TOKEN_ADDRESS = "0x23aE3C5B39B12f0693e05435EeaA1e51d8c61530";
    const encodedExchangerParams = abiEncoder.rawEncode(['address', 'address', 'address'], [APT_TOKEN_ADDRESS, aix.address, contribution.address]);
    await deployer.deploy(Exchanger, APT_TOKEN_ADDRESS, aix.address, contribution.address);
    console.log('EXCHANGER ENCODED: \n', encodedExchangerParams.toString('hex'));
    const exchanger = await Exchanger.deployed();

    const totalCap = new BigNumber(10**18 * 1000);
    const startTime = latestTime() + duration.minutes(5);
    const endTime = latestTime() + duration.weeks(5);

    const _remainderHolder = '0x123';
    const _devHolder = '0x123431';
    const _communityHolder = '0x12343112322';
    const _collector = '0x1234311234322';
    // address _apt,
    // address _exchanger,
    // address _contributionWallet,
    // address _remainderHolder,
    // address _devHolder,
    // address _communityHolder,
    // uint256 _totalEthCap,
    // uint256 _startTime,
    // uint256 _endTime
    await contribution.initialize(aix.address,
      exchanger.address,
      multiSig.address,
      _remainderHolder,
      _devHolder,
      _communityHolder,
      _collector,
      totalCap,
      startTime, endTime
    )
  });
};


async function deployMultisig(deployer, accounts) {
  const owner1 = accounts[0];
  const owner2 = accounts[1];
  const numRequiredSignatures = 1;

  const values = [[owner1, owner2], numRequiredSignatures];
  const encodedParams = abiEncoder.rawEncode(['address[]', 'uint256'], values);
  console.log('MULTISIG PARAMS : \n', encodedParams.toString('hex'));
  return deployer.deploy(MultiSigWallet, [owner1, owner2], 1);
}
