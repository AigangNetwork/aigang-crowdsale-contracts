const MockContribution = artifacts.require("MockContribution");
const AIX = artifacts.require("AIX");
const APT = artifacts.require("APT");
const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
const Exchanger = artifacts.require("MockExchanger");
const MockRemainderTokenHolder = artifacts.require("MockRemainderTokenHolder");
const assert = require("chai").assert;
const BigNumber = web3.BigNumber;
import { expectThrow, duration, latestBlock, getTime } from "./utils.js";

contract(
  "Exchanger",
  ([miner, owner, dev, community, remainder, collector]) => {
    let tokenFactory;
    let aix;
    let contribution;
    let exchanger;
    let apt;
    let tokensPreSold = new BigNumber(50 * 10 ** 18);
    let multiSig = owner;
    let totalCap;
    let collectorWeiCap;
    let sendingAmount;
    let currentTime;
    let remainderHolder;
    let _devHolder;
    let _communityHolder;
    let latestBlockNumber;

    describe("collect", async function() {
      before(async function() {
        tokenFactory = await MiniMeTokenFactory.new();
      });

      beforeEach(async function() {
        apt = await APT.new(tokenFactory.address);
        await apt.generateTokens(owner, tokensPreSold);
        aix = await AIX.new(tokenFactory.address);
        contribution = await MockContribution.new(aix.address);
        exchanger = await Exchanger.new(
          apt.address,
          aix.address,
          contribution.address
        );

        remainderHolder = await MockRemainderTokenHolder.new(
          remainder,
          contribution.address,
          aix.address
        );

        totalCap = new BigNumber(5 * 10 ** 18); // 5 eth
        collectorWeiCap = totalCap.div(10);
        sendingAmount = new BigNumber(10 ** 18); // 1 eth
        currentTime = getTime();
        _devHolder = "0x0039F22efB07A647557C7C5d17854CFD6D489eF2";
        _communityHolder = "0x0039F22efB07A647557C7C5d17854CFD6D489eF3";

        latestBlockNumber = await latestBlock();

        await contribution.setBlockTimestamp(currentTime);
        await contribution.setBlockNumber(latestBlockNumber);

        await aix.changeController(contribution.address);

        await contribution.initialize(
          apt.address,
          exchanger.address,
          multiSig,
          remainderHolder.address,
          _devHolder,
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
      });

      it("collect()", async function() {
        const exchangerBalance = await aix.balanceOf(exchanger.address);
        assert.equal(exchangerBalance.toNumber(), 50 * 2500 * 10 ** 18);
        let ownerBalance = await aix.balanceOf(owner);
        assert.equal(ownerBalance.toNumber(), 0);
        await exchanger.setBlockTimestamp(currentTime + 10);
        await exchanger.collect({ from: owner });
        ownerBalance = await aix.balanceOf(owner);
        assert.equal(ownerBalance.toNumber(), 50 * 2500 * 10 ** 18);
      });

      it("()", async function() {
        const exchangerBalance = await aix.balanceOf(exchanger.address);
        assert.equal(exchangerBalance.toNumber(), 50 * 2500 * 10 ** 18);
        let ownerBalance = await aix.balanceOf(owner);
        assert.equal(ownerBalance.toNumber(), 0);
        await exchanger.setBlockTimestamp(currentTime + 10);
        await exchanger.sendTransaction({ from: owner });
        ownerBalance = await aix.balanceOf(owner);
        assert.equal(ownerBalance.toNumber(), 50 * 2500 * 10 ** 18);
      });

      it("with transferable false", async function() {
        const exchangerBalance = await aix.balanceOf(exchanger.address);
        assert.equal(exchangerBalance.toNumber(), 50 * 2500 * 10 ** 18);
        let ownerBalance = await aix.balanceOf(owner);
        assert.equal(ownerBalance.toNumber(), 0);
        await contribution.allowTransfers(false);
        let transferable = await contribution.transferable();
        assert.isFalse(transferable);
        await exchanger.setBlockTimestamp(currentTime + 10);
        await exchanger.collect({ from: owner });
        ownerBalance = await aix.balanceOf(owner);
        assert.equal(ownerBalance.toNumber(), 50 * 2500 * 10 ** 18);
      });

      it("with transferable true", async function() {
        const exchangerBalance = await aix.balanceOf(exchanger.address);
        assert.equal(exchangerBalance.toNumber(), 50 * 2500 * 10 ** 18);
        let ownerBalance = await aix.balanceOf(owner);
        assert.equal(ownerBalance.toNumber(), 0);
        await contribution.allowTransfers(true);
        let transferable = await contribution.transferable();
        assert.isTrue(transferable);
        await exchanger.setBlockTimestamp(currentTime + 10);
        await exchanger.collect({ from: owner });
        ownerBalance = await aix.balanceOf(owner);
        assert.equal(ownerBalance.toNumber(), 50 * 2500 * 10 ** 18);
      });
    });
  }
);
