const MockContribution = artifacts.require("./MockContribution.sol");
const AIX = artifacts.require("./AIX.sol");
const APT = artifacts.require("./APT.sol");
const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
const Exchanger = artifacts.require("Exchanger");
const assert = require("chai").assert;
const BigNumber = web3.BigNumber;
import { expectThrow } from './utils.js';

function getTime() {
  return web3.eth.getBlock('latest').timestamp;  
}

const duration = {
  seconds: function (val) { return val },
  minutes: function (val) { return val * this.seconds(60) },
  hours: function (val) { return val * this.minutes(60) },
  days: function (val) { return val * this.hours(24) },
  weeks: function (val) { return val * this.days(7) },
  years: function (val) { return val * this.days(365) }
};

async function latestBlock() {
  return new Promise((resolve, reject) => {
    web3.eth.getBlockNumber((error, number) => {
      if (error) {
        reject(error);
      }
      resolve(number);
    });
  })
}

contract("Contribution", ([miner, owner]) => {
  let aix;
  let contribution;
  let exchanger;
  let apt;
  let tokensPreSold = new BigNumber(10 ** 18 * 50);
  let multiSig;
  let totalCap;
  let sendingAmount;
  let currentTime;
  let _remainderHolder;
  let _devHolder;
  let _communityHolder;
  let latestBlockNumber;

  it("#constructor accepts MiniMe instance", async function () {
    const contribution = await MockContribution.new(
      "0x0000000000000000000000000000000000000123"
    );
    const miniMe = await contribution.aix();
    assert.equal(
      miniMe,
      "0x0000000000000000000000000000000000000123",
      "== token address"
    );
  });
  describe("#initialize", async function () {
    beforeEach(async function () {
      const tokenFactory = await MiniMeTokenFactory.new();
      const tokenFactoryAPT = await MiniMeTokenFactory.new();
      apt = await APT.new(tokenFactoryAPT.address);
      await apt.generateTokens(owner, tokensPreSold);
      aix = await AIX.new(tokenFactory.address);
      contribution = await MockContribution.new(aix.address);
      exchanger = await Exchanger.new(apt.address, aix.address, contribution.address);

      multiSig = owner;
      totalCap = new BigNumber(1000 * 10 ** 18); //1000 eth
      sendingAmount = new BigNumber(10 ** 18); // 1 eth
      currentTime = getTime();
      _remainderHolder = '0x0039F22efB07A647557C7C5d17854CFD6D489eF1';
      _devHolder = '0x0039F22efB07A647557C7C5d17854CFD6D489eF2';
      _communityHolder = '0x0039F22efB07A647557C7C5d17854CFD6D489eF3';

      latestBlockNumber = await latestBlock();

      await contribution.setBlockTimestamp(currentTime);
      await contribution.setBlockNumber(latestBlockNumber);

    });

    it("happy path", async function () {
      await aix.changeController(contribution.address);

      await contribution.initialize(
        apt.address,
        exchanger.address,
        multiSig,
        _remainderHolder,
        _devHolder,
        _communityHolder,
        totalCap,
        currentTime + 1,
        currentTime + 10
      );
      //public values
      const contributionWallet = await contribution.contributionWallet();
      const totalSupplyCap = await contribution.totalWeiCap();
      const totalSold = await contribution.totalWeiCollected();
      const startTime = await contribution.startTime();
      const endTime = await contribution.endTime();
      const initializedTime = await contribution.initializedTime();
      const finalizedTime = await contribution.finalizedTime();
      const initializedBlock = await contribution.initializedBlock();
      const finalizedBlock = await contribution.finalizedBlock();
      const paused = await contribution.paused();
      const transferable = await contribution.transferable();

      // check that exchanger received tokens from PreSale APT

      const exchangerBalance = await aix.balanceOf(exchanger.address);
      const totalSupplyAt = await apt.totalSupplyAt(latestBlockNumber);
      assert.equal(exchangerBalance.toString(10), totalSupplyAt.mul(1250).toString(10));

      assert.equal(contributionWallet, multiSig);
      assert.equal(totalSupplyCap.toNumber(), totalCap);
      assert.equal(totalSold.toString(10), tokensPreSold.toString(10));
      assert.equal(startTime.toNumber(), currentTime + 1);
      assert.equal(endTime.toNumber(), currentTime + 10);
      assert.equal(initializedTime.toNumber(), currentTime);
      assert.equal(finalizedTime.toNumber(), 0);
      assert.equal(initializedBlock.toNumber(), latestBlockNumber);
      assert.equal(finalizedBlock.toNumber(), 0);
      assert.equal(transferable, false);
      assert.equal(paused, false);
    });
    it('throws when you try to dobule initialize', async function () {
      await aix.changeController(contribution.address);
      await contribution.initialize(
        apt.address,
        exchanger.address,
        multiSig,
        _remainderHolder,
        _devHolder,
        _communityHolder,
        totalCap,
        currentTime + 1,
        currentTime + 10
      );
      const initializedTime = await contribution.initializedTime();
      const initializedBlock = await contribution.initializedBlock();

      await contribution.setBlockTimestamp(currentTime + 10);
      await contribution.setBlockNumber(latestBlockNumber + 10);

      await expectThrow(contribution.initialize(
        apt.address,
        exchanger.address,
        multiSig,
        _remainderHolder,
        _devHolder,
        _communityHolder,
        totalCap,
        currentTime + 1,
        currentTime + 10
      ));
      assert.equal(initializedTime.toNumber(), currentTime);
      assert.equal(initializedBlock.toNumber(), latestBlockNumber);
    })
    it('throws when controller of aix is not contribution', async function () {
      await expectThrow(contribution.initialize(
        apt.address,
        exchanger.address,
        multiSig,
        _remainderHolder,
        _devHolder,
        _communityHolder,
        totalCap,
        currentTime + 1,
        currentTime + 10
      ));
      const initializedTime = await contribution.initializedTime();
      const initializedBlock = await contribution.initializedBlock();
      assert.equal(initializedTime.toNumber(), 0);
      assert.equal(initializedBlock.toNumber(), 0);

    })
    it('throws startTime is less then currentTime', async function () {
      await aix.changeController(contribution.address);
      await expectThrow(contribution.initialize(
        apt.address,
        exchanger.address,
        multiSig,
        _remainderHolder,
        _devHolder,
        _communityHolder,
        totalCap,
        currentTime - 1,
        currentTime + 10
      ));
      const initializedTime = await contribution.initializedTime();
      const initializedBlock = await contribution.initializedBlock();
      assert.equal(initializedTime.toNumber(), 0);
      assert.equal(initializedBlock.toNumber(), 0);
    })
    it('throws totalWeiCap is 0', async function () {
      await aix.changeController(contribution.address);
      await expectThrow(contribution.initialize(
        apt.address,
        exchanger.address,
        multiSig,
        _remainderHolder,
        _devHolder,
        _communityHolder,
        0,
        currentTime + 1,
        currentTime + 10
      ));
      const initializedTime = await contribution.initializedTime();
      const initializedBlock = await contribution.initializedBlock();
      assert.equal(initializedTime.toNumber(), 0);
      assert.equal(initializedBlock.toNumber(), 0);
    })
    it('throws when startTime > endTime', async function () {
      await aix.changeController(contribution.address);
      await expectThrow(contribution.initialize(
        apt.address,
        exchanger.address,
        multiSig,
        _remainderHolder,
        _devHolder,
        _communityHolder,
        totalCap,
        currentTime + 11,
        currentTime + 1
      ));
      const initializedTime = await contribution.initializedTime();
      const initializedBlock = await contribution.initializedBlock();
      assert.equal(initializedTime.toNumber(), 0);
      assert.equal(initializedBlock.toNumber(), 0);
    })

    it("White and blacklisting investors", async function () {
      let investor = '0x0000000000000000000000000000000000000123';
      assert.isFalse(await contribution.canPurchase(investor));
      assert.equal(await contribution.numWhitelistedInvestors(), 0);

      await contribution.whitelist(investor);
      assert.isTrue(await contribution.canPurchase(investor));
      assert.equal(await contribution.numWhitelistedInvestors(), 1);

      await contribution.blacklist(investor);
      assert.isFalse(await contribution.canPurchase(investor));
      assert.equal(await contribution.numWhitelistedInvestors(), 0);
    });
  });
  describe('#exchangeRate', async function () {
    beforeEach(async function () {
      const tokenFactory = await MiniMeTokenFactory.new();
      const tokenFactoryAPT = await MiniMeTokenFactory.new();
      apt = await APT.new(tokenFactoryAPT.address);
      await apt.generateTokens(owner, tokensPreSold);
      aix = await AIX.new(tokenFactory.address);
      contribution = await MockContribution.new(aix.address);
      exchanger = await Exchanger.new(apt.address, aix.address, contribution.address);

      multiSig = owner;
      totalCap = new BigNumber(1000 * 10 ** 18); //1000 eth
      sendingAmount = new BigNumber(10 ** 18); // 1 eth
      currentTime = getTime();
      _remainderHolder = '0x0039F22efB07A647557C7C5d17854CFD6D489eF1';
      _devHolder = '0x0039F22efB07A647557C7C5d17854CFD6D489eF2';
      _communityHolder = '0x0039F22efB07A647557C7C5d17854CFD6D489eF3';

      latestBlockNumber = await latestBlock();

      await contribution.setBlockTimestamp(currentTime);
      await contribution.setBlockNumber(latestBlockNumber);
      await aix.changeController(contribution.address);
      await contribution.initialize(
        apt.address,
        exchanger.address,
        multiSig,
        _remainderHolder,
        _devHolder,
        _communityHolder,
        totalCap,
        currentTime + 1,
        currentTime + 10
      );
    })
    it('calculates different discount rates based on time ', async function () {
      //first hour
      let exchnageRate = await contribution.exchangeRate();
      assert.equal(exchnageRate.toNumber(), 1136); //12% discount. 0.88eth ~1000 aix
      // second hour
      await contribution.setBlockTimestamp(currentTime + duration.hours(2));
      exchnageRate = await contribution.exchangeRate();

      //after 2 hr.
      await contribution.setBlockTimestamp(currentTime + duration.hours(2) + duration.minutes(1));
      exchnageRate = await contribution.exchangeRate();
      assert.equal(exchnageRate.toNumber(), 1000); // 6% discount
    });
  })

  describe('#proxyPayment', async function () {
    beforeEach(async function () {
      const tokenFactory = await MiniMeTokenFactory.new();
      const tokenFactoryAPT = await MiniMeTokenFactory.new();
      apt = await APT.new(tokenFactoryAPT.address);
      await apt.generateTokens(owner, tokensPreSold);
      aix = await AIX.new(tokenFactory.address);
      contribution = await MockContribution.new(aix.address);
      exchanger = await Exchanger.new(apt.address, aix.address, contribution.address);

      multiSig = owner;
      totalCap = new BigNumber(1000 * 10 ** 18); //1000 eth
      sendingAmount = new BigNumber(1 * 10 ** 18); // 1 eth
      currentTime = getTime();
      _remainderHolder = '0x0039F22efB07A647557C7C5d17854CFD6D489eF1';
      _devHolder = '0x0039F22efB07A647557C7C5d17854CFD6D489eF2';
      _communityHolder = '0x0039F22efB07A647557C7C5d17854CFD6D489eF3';

      latestBlockNumber = await latestBlock();

      await contribution.setBlockTimestamp(currentTime);
      await contribution.setBlockNumber(latestBlockNumber);
      await aix.changeController(contribution.address);
      await contribution.initialize(
        apt.address,
        exchanger.address,
        multiSig,
        _remainderHolder,
        _devHolder,
        _communityHolder,
        totalCap,
        currentTime + duration.seconds(2),
        currentTime + duration.hours(1)
      );
    })
    it('happy path with fallback', async function () {
      assert.isFalse(await contribution.canPurchase(owner));
      await contribution.setBlockTimestamp(currentTime + duration.minutes(2) );
      await contribution.setBlockNumber(latestBlockNumber + 10);
      await contribution.whitelistAddresses([owner, miner, _remainderHolder, _devHolder]);
      let weiToCollect = await contribution.investorWeiToCollect(owner);      
      await contribution.sendTransaction({ from: owner, value: sendingAmount.mul(4)});
      await contribution.sendTransaction({ from: miner, value: sendingAmount.mul(2)});
      const individualWeiCollected = await contribution.individualWeiCollected(owner);
      let totalWeiCollected = await contribution.totalWeiCollected();
      const newtotal = sendingAmount.mul(4).add(sendingAmount.mul(2)).add(tokensPreSold);
      assert.equal(totalWeiCollected.toString(10), newtotal.toString(10));
      assert.equal(individualWeiCollected.toString(10), sendingAmount.mul(4).toString(10));
      const balanceOfOwner = await aix.balanceOf(owner);
      const balanceOfMiner = await aix.balanceOf(miner);
      assert.equal(balanceOfOwner.toNumber(), sendingAmount.mul(4).mul(1136));
      assert.equal(balanceOfMiner.toNumber(), sendingAmount.mul(2).mul(1136));
    });

    it('throws when below sendingAmount', async function () {
      assert.isFalse(await contribution.canPurchase(owner));
      await contribution.setBlockTimestamp(currentTime + duration.minutes(2) );
      await contribution.setBlockNumber(latestBlockNumber + 10);
      await contribution.whitelist(owner);
      await contribution.sendTransaction({ from: owner, value: 1 });
      const balanceOfOwner = await aix.balanceOf(owner);
      assert.equal(balanceOfOwner.toNumber(), 1136);
    });

    it('allows multisig to buy tokens', async function() {
      const MultiSigWallet = artifacts.require("MultiSigWallet");
      const multiSig = await MultiSigWallet.new([miner, owner], 1);
      await contribution.setBlockTimestamp(currentTime + duration.minutes(2) );
      await contribution.setBlockNumber(latestBlockNumber + 10);

      await web3.eth.sendTransaction({ from: miner, to: multiSig.address, value: new BigNumber(10**18) });
      await contribution.whitelistAddresses([multiSig.address]);

      const encodedProxyPaymentCall = contribution.contract.proxyPayment.getData(contribution.address);

      let totalWeiCollected = await contribution.totalWeiCollected();
      assert.equal(tokensPreSold.toString(10), totalWeiCollected.toString(10));

      const amountToSendFromMultiSig = new BigNumber(10**18 * 0.5);
      await multiSig.submitTransaction(contribution.address, amountToSendFromMultiSig, '0x0');
      const individualWeiCollected = await contribution.individualWeiCollected(multiSig.address);
      totalWeiCollected = await contribution.totalWeiCollected();

      const newtotal = amountToSendFromMultiSig.add(tokensPreSold);

      assert.equal(totalWeiCollected.toString(10), newtotal.toString(10), 'totalWeiCollected is incorrect');

      const balanceOf = await aix.balanceOf(multiSig.address);
      assert.equal(balanceOf.toString(10), amountToSendFromMultiSig.mul(1136).toString(10));

    })
    it('contribution wallet should receive funds', async function() {})
  })

  describe('#weiToCollect', async function(){
    it('within first day')
    it('after first day')
  })

  describe('#whitelistAddresses', async function() {
    let addresses = ["0xD7dFCEECe5bb82F397f4A9FD7fC642b2efB1F565",
    "0x501AC3B461e7517D07dCB5492679Cc7521AadD42",
    "0xDc76C949100FbC502212c6AA416195Be30CE0732",
    "0x2C49e8184e468F7f8Fb18F0f29f380CD616eaaeb",
    "0xB3d3c445Fa47fe40a03f62d5D41708aF74a5C387",
    "0x34D468BFcBCc0d83F4DF417E6660B3Cf3e14F62A",
    "0x27E6FaE913861180fE5E95B130d4Ae4C58e2a4F4",
    "0x7B199FAf7611421A02A913EAF3d150E359718C2B",
    "0x086282022b8D0987A30CdD508dBB3236491F132e",
    "0xdd39B760748C1CA92133FD7Fc5448F3e6413C138",
    "0x0868411cA03e6655d7eE957089dc983d74b9Bf1A",
    "0x4Ec993E1d6980d7471Ca26BcA67dE6C513165922"];
    beforeEach(async function(){
      const tokenFactory = await MiniMeTokenFactory.new();
      aix = await AIX.new(tokenFactory.address);
      contribution = await MockContribution.new(aix.address);
    })
    it('should whitelist an array of addresses', async function(){
      assert.isFalse(await contribution.canPurchase(owner));
      assert.isFalse(await contribution.canPurchase(miner));
      await contribution.whitelistAddresses([owner, miner, ...addresses]);
      assert.isTrue(await contribution.canPurchase(owner));
      assert.isTrue(await contribution.canPurchase(miner));
      assert.isTrue(await contribution.canPurchase(addresses[addresses.length - 1]));
      await contribution.blacklistAddresses([owner, miner, ...addresses]);
      assert.isFalse(await contribution.canPurchase(owner));
      assert.isFalse(await contribution.canPurchase(miner));
      assert.isFalse(await contribution.canPurchase(addresses[addresses.length - 1]));
    })

    it('can only be called from controller', async function(){
      await expectThrow(contribution.whitelistAddresses([owner, miner, ...addresses], {from: addresses[0]}));
      await expectThrow(contribution.blacklistAddresses([owner, miner, ...addresses], {from: addresses[0]}));
    })
  })
});
