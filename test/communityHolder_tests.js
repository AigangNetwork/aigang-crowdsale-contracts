const MockContribution = artifacts.require("MockContribution");
const AIX = artifacts.require("AIX");
const APT = artifacts.require("APT");
const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
const Exchanger = artifacts.require("Exchanger");
const MockCommunityTokenHolder = artifacts.require("MockCommunityTokenHolder");

const assert = require("chai").assert;
const BigNumber = web3.BigNumber;

import { expectThrow, duration, latestBlock, getTime } from "./utils.js";

contract("CommunityHolder", ([miner, owner, dev, community, remainder, collector]) => {
  let tokenFactory;
  let aix;
  let contribution;
  let exchanger;
  let apt;
  let tokensPreSold = 0;
  let multiSig = owner;
  let totalCap;
  let collectorWeiCap;
  let currentTime;
  let _remainderHolder;
  let _devHolder;
  let communityHolder;
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

      communityHolder = await MockCommunityTokenHolder.new(
        community,
        contribution.address,
        aix.address
      );

      totalCap = new BigNumber(5 * 10 ** 18); // 5 eth
      collectorWeiCap = new BigNumber(1 * 10 ** 18); // 1 eth
      currentTime = getTime();

      _remainderHolder = "0x0039F22efB07A647557C7C5d17854CFD6D489eF1";
      _devHolder = "0x0039F22efB07A647557C7C5d17854CFD6D489eF2";

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
        communityHolder.address,
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

    it("Test comunity holder balanbe after finalizing", async function() {
       const communityHolderBalance = await aix.balanceOf(
        communityHolder.address
      );
  
      const totalSupplyAfterContribution = await aix.totalSupply();

      assert.equal(
        (communityHolderBalance.toNumber() / 10 ** 18).toFixed(11), //.toFixed(11) take only last 11 digits because 12 digit is different of rounding problems
        ((5 * 2000) / 51 * 29).toFixed(11), 
        'communityHolderBalance is not equal'
      );
      assert.equal(
        totalSupplyAfterContribution.toNumber() / 10 ** 18,
        (5 * 2000)  / 51 * 100,
        'totalSupplyAfterContribution is not equal'
      );
    });

    it("Community can access 7 % after finalizing and 29 % after a year of tokens", async function() {
      let communityBalance = await aix.balanceOf(community);
      let totalCommunityHolderBalance = await aix.balanceOf(communityHolder.address);

      assert.equal(communityBalance.toNumber(), 0, 'communityBalance should be 0');

      currentTime = await getTime();

      // First try
      await communityHolder.setBlockTimestamp( currentTime + duration.minutes(1));
      await communityHolder.collectTokens({ from: community });
      
      communityBalance = await aix.balanceOf(community);
      let currentCommunityHolderBalance = await aix.balanceOf(communityHolder.address);
      
      let expectedComunityBalance = (5 * 2000) * 10 ** 18 / 51 * 7; // 1.3725490196078432e+21
    
      assert.equal(
        communityBalance.toNumber(),
        expectedComunityBalance,
         'community balance should be 7 %'
      );

      assert.equal(
        ((totalCommunityHolderBalance.toNumber() - expectedComunityBalance) / 10 ** 18).toFixed(11),
        (currentCommunityHolderBalance.toNumber() / 10 ** 18).toFixed(11),
         'community holder balance should decrease'
      );
      

      // Second try should remaing the same 

      await communityHolder.setBlockTimestamp( currentTime + duration.minutes(5));
      await communityHolder.collectTokens({ from: community });
      
      communityBalance = await aix.balanceOf(community);
      currentCommunityHolderBalance = await aix.balanceOf(communityHolder.address);  
      
      assert.equal(
        communityBalance.toNumber(),
        expectedComunityBalance,
         'community balance should be not changed'
      );

      assert.equal(
        ((totalCommunityHolderBalance.toNumber() - expectedComunityBalance) / 10 ** 18).toFixed(11),
        (currentCommunityHolderBalance.toNumber() / 10 ** 18).toFixed(11),
         'community holder balance should decrease'
      );

      // Third try after a years 

      await communityHolder.setBlockTimestamp( currentTime + duration.years(1)+ duration.minutes(5));
      await communityHolder.collectTokens({ from: community });
      
      communityBalance = await aix.balanceOf(community);
      currentCommunityHolderBalance = await aix.balanceOf(communityHolder.address);  

      expectedComunityBalance = (5 * 2000) / 51 * 29; 
      
      assert.equal(
        (communityBalance.toNumber() / 10 ** 18).toFixed(11),
        expectedComunityBalance.toFixed(11),
          'community balance should be 29 %'
      );

      assert.equal(
        currentCommunityHolderBalance.toNumber(),
        0,
          'community holder balance should decrease to 0'
      );

      // Fourth try after a years should not change values

      await communityHolder.setBlockTimestamp( currentTime + duration.years(1)+ duration.minutes(10));
      await communityHolder.collectTokens({ from: community });
      
      communityBalance = await aix.balanceOf(community);
      currentCommunityHolderBalance = await aix.balanceOf(communityHolder.address);  
      
      assert.equal(
        (communityBalance.toNumber() / 10 ** 18).toFixed(11),
        expectedComunityBalance.toFixed(11),
          'community balance should remain the 29 %'
      );

      assert.equal(
        currentCommunityHolderBalance.toNumber(),
        0,
          'community holder balance should remain 0'
      );
    });
  });
});
