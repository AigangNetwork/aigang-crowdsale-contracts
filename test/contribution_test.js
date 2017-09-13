const MockContribution = artifacts.require("./MockContribution.sol");
const AIX = artifacts.require("./AIX.sol");
const APT = artifacts.require("./APT.sol");
const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
const Exchanger = artifacts.require("Exchanger");
const assert = require("chai").assert;
const BigNumber = web3.BigNumber;
import { expectThrow } from './utils.js';

function getTime() {
  return Math.floor(Date.now() / 1000);
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
  let minimum;
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
      totalCap = 1000 * 10 ** 18; //1000 eth
      minimum = 10 ** 18; // 1 eth
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
        minimum,
        currentTime + 1,
        currentTime + 10
      );
      //public values
      const contributionWallet = await contribution.contributionWallet();
      const totalSupplyCap = await contribution.totalEthCap();
      const totalSold = await contribution.totalEthCollected();
      const minimum_investment = await contribution.minimum_investment();
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
      assert.equal(minimum_investment.toNumber(), minimum + 1);
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
        minimum,
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
        minimum,
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
        minimum,
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
        minimum,
        currentTime - 1,
        currentTime + 10
      ));
      const initializedTime = await contribution.initializedTime();
      const initializedBlock = await contribution.initializedBlock();
      assert.equal(initializedTime.toNumber(), 0);
      assert.equal(initializedBlock.toNumber(), 0);
    })
    it('throws totalEthCap is 0', async function () {
      await aix.changeController(contribution.address);
      await expectThrow(contribution.initialize(
        apt.address,
        exchanger.address,
        multiSig,
        _remainderHolder,
        _devHolder,
        _communityHolder,
        0,
        minimum,
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
        minimum,
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
      totalCap = 1000 * 10 ** 18; //1000 eth
      minimum = 10 ** 18; // 1 eth
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
        minimum,
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
});
