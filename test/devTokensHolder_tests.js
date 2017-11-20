const MockContribution = artifacts.require("MockContribution");
const AIX = artifacts.require("AIX");
const APT = artifacts.require("APT");
const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
const Exchanger = artifacts.require("Exchanger");
const MockDevTokensHolder = artifacts.require("MockDevTokensHolder");

const assert = require("chai").assert;
const BigNumber = web3.BigNumber;

import { expectThrow, duration, latestBlock, getTime } from "./utils.js";

contract("DevTokensHolder", ([miner, owner, dev, community, remainder, collector]) => {
  let tokenFactory;
  let aix;
  let contribution;
  let exchanger;
  let apt;
  let tokensPreSold = new BigNumber(4 * 10 ** 18);
  let multiSig = owner;
  let totalCap;
  let collectorWeiCap;
  let currentTime;
  let _remainderHolder;
  let devHolder;
  let _communityHolder;
  let latestBlockNumber;

  describe("#finalize", async function() {
    before(async function() {
      tokenFactory = await MiniMeTokenFactory.new();
      apt = await APT.new(tokenFactory.address);
      await apt.generateTokens(owner, tokensPreSold);
    });

    beforeEach(async function() {
      aix = await AIX.new(tokenFactory.address);
      contribution = await MockContribution.new(aix.address);

      exchanger = await Exchanger.new(
        apt.address,
        aix.address,
        contribution.address
      );

      devHolder = await MockDevTokensHolder.new(
        dev,
        contribution.address,
        aix.address
      );

      totalCap = new BigNumber(5 * 10 ** 18); // 5 eth
      collectorWeiCap = new BigNumber(1 * 10 ** 18); // 1 eth
      currentTime = getTime();

      _remainderHolder = "0x0039F22efB07A647557C7C5d17854CFD6D489eF1";
      _communityHolder = "0x0039F22efB07A647557C7C5d17854CFD6D489eF3";

      latestBlockNumber = await latestBlock();

      await contribution.setBlockTimestamp(currentTime);
      await contribution.setBlockNumber(latestBlockNumber);

      await aix.changeController(contribution.address);

      await contribution.initialize(
        apt.address,
        exchanger.address,
        multiSig,
        _remainderHolder,
        devHolder.address,
        _communityHolder,
        collector,
        collectorWeiCap,
        totalCap,
        currentTime + 1,
        currentTime + 10
      );

      currentTime = getTime();
      latestBlockNumber = await latestBlock();
      await contribution.setBlockTimestamp(currentTime + 1);
      await contribution.setBlockNumber(latestBlockNumber + 1);
      await contribution.finalize();
      await contribution.allowTransfers(true);
    });

    it("Test dev holder balance after finalizing", async function() {
      const devHolderBalance = await aix.balanceOf(devHolder.address);
      const devBalance = await aix.balanceOf(dev);
      const totalSupplyAfterContribution = await aix.totalSupply();

      assert.equal(
        totalSupplyAfterContribution.toNumber() / 10 ** 18,
        (5 * 2000)  / 51 * 100,
        'totalSupplyAfterContribution is not equal'
      );

      assert.equal(
        (devHolderBalance.toNumber() / 10 ** 18).toFixed(11), //.toFixed(11) take only last 11 digits because 12 digit is different of rounding problems
        ((5 * 2000) / 51 * 20).toFixed(11), 
        'devHolder is not equal'
      );

      assert.equal(
        devBalance,
        0,
        'devBalance is not 0'
      );

    });

    it("Test dev holder balance after finalizing and collecting", async function() {
      const devHolderBalance = await aix.balanceOf(devHolder.address);
      const devBalance = await aix.balanceOf(dev);

      currentTime = await getTime();
      
      // First try
      await devHolder.setBlockTimestamp( currentTime + duration.minutes(1));
      await devHolder.collectTokens({ from: dev });

      assert.equal(
        (devHolderBalance.toNumber() / 10 ** 18).toFixed(11), //.toFixed(11) take only last 11 digits because 12 digit is different of rounding problems
        ((5 * 2000) / 51 * 20).toFixed(11), 
        'devHolder is not equal'
      );

      assert.equal(
        devBalance,
        0,
        'devBalance is not 0'
      );
    });

    it("Test dev holder balance after 3 months", async function() {
      currentTime = await getTime();
      
      // First try
      await devHolder.setBlockTimestamp( currentTime + duration.months(3)+ duration.days(2));
      await devHolder.collectTokens({ from: dev });

      let devHolderBalance = await aix.balanceOf(devHolder.address);
      let devBalance = await aix.balanceOf(dev);

      let percentage =  await devHolder.extractablePercentage();

      assert.equal(
        percentage, //.toFixed(11) take only last 11 digits because 12 digit is different of rounding problems
        25, 
        'should be 1/4'
      );

      assert.equal(
        (devHolderBalance.toNumber() / 10 ** 18).toFixed(11), //.toFixed(11) take only last 11 digits because 12 digit is different of rounding problems
        ((5 * 2000) / 51 * 15).toFixed(11), 
        'devHolder is not equal'
      );

      assert.equal(
        (devBalance.toNumber() / 10 ** 18).toFixed(11),
        ((5 * 2000) / 51 * 5).toFixed(11),
        'devBalance should be not 0'
      );

      // second try
      await devHolder.setBlockTimestamp( currentTime + duration.months(4)+ duration.days(2));
      await devHolder.collectTokens({ from: dev });

      devHolderBalance = await aix.balanceOf(devHolder.address);
      devBalance = await aix.balanceOf(dev);

      percentage =  await devHolder.extractablePercentage();

      assert.equal(
        percentage, //.toFixed(11) take only last 11 digits because 12 digit is different of rounding problems
        25, 
        'should be 1/4'
      );

      assert.equal(
        (devHolderBalance.toNumber() / 10 ** 18).toFixed(11), //.toFixed(11) take only last 11 digits because 12 digit is different of rounding problems
        ((5 * 2000) / 51 * 15).toFixed(11), 
        'devHolder is not equal'
      );

      assert.equal(
        (devBalance.toNumber() / 10 ** 18).toFixed(11),
        ((5 * 2000) / 51 * 5).toFixed(11),
        'devBalance should be not 0'
      );

    });

    it("Test dev holder balance after 6 months", async function() {
      currentTime = await getTime();
      
      // First try
      await devHolder.setBlockTimestamp( currentTime + duration.months(6)+ duration.days(2));
      await devHolder.collectTokens({ from: dev });

      const devHolderBalance = await aix.balanceOf(devHolder.address);
      const devBalance = await aix.balanceOf(dev);

      let percentage =  await devHolder.extractablePercentage();

      assert.equal(
        percentage, //.toFixed(11) take only last 11 digits because 12 digit is different of rounding problems
        50, 
        'should be 1.2'
      );

      assert.equal(
        (devHolderBalance.toNumber() / 10 ** 18).toFixed(11), //.toFixed(11) take only last 11 digits because 12 digit is different of rounding problems
        ((5 * 2000) / 51 * 10).toFixed(11), 
        'devHolder is not equal'
      );

      assert.equal(
        (devBalance.toNumber() / 10 ** 18).toFixed(11),
        ((5 * 2000) / 51 * 10).toFixed(11),
        'devBalance is not equal'
      );
    });

    it("Test dev holder balance after 9 months", async function() {
      currentTime = await getTime();
      
      // First try
      await devHolder.setBlockTimestamp( currentTime + duration.months(9)+ duration.days(2));
      await devHolder.collectTokens({ from: dev });

      const devHolderBalance = await aix.balanceOf(devHolder.address);
      const devBalance = await aix.balanceOf(dev);

      assert.equal(
        (devHolderBalance.toNumber() / 10 ** 18).toFixed(11), //.toFixed(11) take only last 11 digits because 12 digit is different of rounding problems
        ((5 * 2000) / 51 * 5).toFixed(11), 
        'devHolder is not equal'
      );

      assert.equal(
        (devBalance.toNumber() / 10 ** 18).toFixed(11),
        ((5 * 2000) / 51 * 15).toFixed(11),
        'devBalance is not equal'
      );
    });

    it("Test dev holder balance after 12 months pulling two times in a row and more", async function() {
      currentTime = await getTime();
      
      // First try
      await devHolder.setBlockTimestamp( currentTime + duration.months(9)+ duration.days(2));
      await devHolder.collectTokens({ from: dev });

      let devHolderBalance = await aix.balanceOf(devHolder.address);
      let devBalance = await aix.balanceOf(dev);

      let percentage =  await devHolder.extractablePercentage();

      assert.equal(
        percentage, //.toFixed(11) take only last 11 digits because 12 digit is different of rounding problems
        75, 
        'should be 3/4'
      );

      assert.equal(
        (devHolderBalance.toNumber() / 10 ** 18).toFixed(11), //.toFixed(11) take only last 11 digits because 12 digit is different of rounding problems
        ((5 * 2000) / 51 * 5).toFixed(11), 
        'devHolder is not equal'
      );

      assert.equal(
        (devBalance.toNumber() / 10 ** 18).toFixed(11),
        ((5 * 2000) / 51 * 15).toFixed(11),
        'devBalance is not equal'
      );


      // Second try
      await devHolder.setBlockTimestamp( currentTime + duration.months(12)+ duration.days(2));
      await devHolder.collectTokens({ from: dev });

      devHolderBalance = await aix.balanceOf(devHolder.address);
      devBalance = await aix.balanceOf(dev);

      assert.equal(
        devHolderBalance.toNumber(), 
        0, 
        'devHolder is not 0'
      );

      assert.equal(
        (devBalance.toNumber() / 10 ** 18).toFixed(11),
        ((5 * 2000) / 51 * 20).toFixed(11),
        'devBalance is not equal'
      );

      // Third try
      await devHolder.setBlockTimestamp( currentTime + duration.months(12)+ duration.days(3));
      await devHolder.collectTokens({ from: dev });

      devHolderBalance = await aix.balanceOf(devHolder.address);
      devBalance = await aix.balanceOf(dev);

      assert.equal(
        devHolderBalance.toNumber(), 
        0, 
        'devHolder is not zero again'
      );

      assert.equal(
        (devBalance.toNumber() / 10 ** 18).toFixed(11),
        ((5 * 2000) / 51 * 20).toFixed(11),
        'devBalance is not equal'
      );

    });

    it("Test dev tokens holder safety method to claimTokens APT", async function() {
      await apt.generateTokens(devHolder.address, new BigNumber(3));

      let devHolderAPTBalance = await apt.balanceOf(devHolder.address);
      let devAPTBalance = await apt.balanceOf(dev);      

      assert.equal(devHolderAPTBalance.toString(), '3', 'devHolderAPTBalance is not 3');
      assert.equal(devAPTBalance.toString(), '0', 'devAPTBalance is not 0');

      await devHolder.claimTokens(apt.address,{ from: dev });

      devAPTBalance = await apt.balanceOf(dev);  
      devHolderAPTBalance = await apt.balanceOf(devHolder.address);  

      assert.equal(devAPTBalance.toString(), '3', 'devAPTBalance is not 3'); 
      assert.equal(devHolderAPTBalance.toString(), '0', 'devHolderAPTBalance is not 0');           
    });

    it("Test dev tokens holder should not accept ETH", async function() {      
      try {
        web3.eth.sendTransaction({
          from: miner,
          to: devHolder.address,
          value: new BigNumber(10 ** 18)
        });

        assert.isTrue(false);
      } catch (error) {
        assert.equal(error.message, "VM Exception while processing transaction: invalid opcode");
      }
    });    
  });
});
