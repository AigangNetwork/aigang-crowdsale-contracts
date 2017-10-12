const MockContribution = artifacts.require("./MockContribution.sol");
const AIX = artifacts.require("./AIX.sol");
const APT = artifacts.require("./APT.sol");
const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
const Exchanger = artifacts.require("Exchanger");
const assert = require("chai").assert;
const BigNumber = web3.BigNumber;
import { expectThrow, duration, latestBlock, getTime } from "./utils.js";

contract("Contribution", ([miner, owner, investor, collector]) => {
  let aix;
  let contribution;
  let exchanger;
  let apt;
  let tokensPreSold = new BigNumber(10 ** 18 * 50);
  let multiSig;
  let totalCap;
  let collectorWeiCap;
  let sendingAmount;
  let currentTime;
  let _remainderHolder;
  let _devHolder;
  let _communityHolder;
  let latestBlockNumber;
  let addresses = [
    "0xD7dFCEECe5bb82F397f4A9FD7fC642b2efB1F565",
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
    "0x4Ec993E1d6980d7471Ca26BcA67dE6C513165922"
  ];

  it("#constructor accepts MiniMe instance", async function() {
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
  describe("#initialize", async function() {
    beforeEach(async function() {
      const tokenFactory = await MiniMeTokenFactory.new();
      const tokenFactoryAPT = await MiniMeTokenFactory.new();
      apt = await APT.new(tokenFactoryAPT.address);
      await apt.generateTokens(owner, tokensPreSold);
      aix = await AIX.new(tokenFactory.address);
      contribution = await MockContribution.new(aix.address);
      exchanger = await Exchanger.new(
        apt.address,
        aix.address,
        contribution.address
      );

      multiSig = owner;
      totalCap = new BigNumber(1000 * 10 ** 18); //1000 eth
      collectorWeiCap = totalCap.div(10);
      sendingAmount = new BigNumber(10 ** 18); // 1 eth
      currentTime = getTime();
      _remainderHolder = "0x0039F22efB07A647557C7C5d17854CFD6D489eF1";
      _devHolder = "0x0039F22efB07A647557C7C5d17854CFD6D489eF2";
      _communityHolder = "0x0039F22efB07A647557C7C5d17854CFD6D489eF3";

      latestBlockNumber = await latestBlock();

      await contribution.setBlockTimestamp(currentTime);
      await contribution.setBlockNumber(latestBlockNumber);
    });

    it("happy path", async function() {
      await aix.changeController(contribution.address);

      await contribution.initialize(
        apt.address,
        exchanger.address,
        multiSig,
        _remainderHolder,
        _devHolder,
        _communityHolder,
        collector,
        collectorWeiCap,
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
      const minimumPerTransaction = await contribution.minimumPerTransaction();

      // check that exchanger received tokens from PreSale APT

      const exchangerBalance = await aix.balanceOf(exchanger.address);
      const totalSupplyAt = await apt.totalSupplyAt(latestBlockNumber);
      assert.equal(
        exchangerBalance.toString(10),
        totalSupplyAt.mul(2500).toString(10)
      );

      assert.equal(contributionWallet, multiSig);
      assert.equal(totalSupplyCap.toNumber(), totalCap);
      assert.equal(totalSold.toString(10), "0");
      assert.equal(startTime.toNumber(), currentTime + 1);
      assert.equal(endTime.toNumber(), currentTime + 10);
      assert.equal(initializedTime.toNumber(), currentTime);
      assert.equal(finalizedTime.toNumber(), 0);
      assert.equal(initializedBlock.toNumber(), latestBlockNumber);
      assert.equal(finalizedBlock.toNumber(), 0);
      assert.equal(transferable, false);
      assert.equal(paused, false);
      assert.equal(minimumPerTransaction.toString(), web3.toWei(0.01, "ether"));
    });
    it("throws when you try to dobule initialize", async function() {
      await aix.changeController(contribution.address);
      await contribution.initialize(
        apt.address,
        exchanger.address,
        multiSig,
        _remainderHolder,
        _devHolder,
        _communityHolder,
        collector,
        collectorWeiCap,
        totalCap,
        currentTime + 1,
        currentTime + 10
      );
      const initializedTime = await contribution.initializedTime();
      const initializedBlock = await contribution.initializedBlock();

      await contribution.setBlockTimestamp(currentTime + 10);
      await contribution.setBlockNumber(latestBlockNumber + 10);

      await expectThrow(
        contribution.initialize(
          apt.address,
          exchanger.address,
          multiSig,
          _remainderHolder,
          _devHolder,
          _communityHolder,
          collector,
          collectorWeiCap,
          totalCap,
          currentTime + 1,
          currentTime + 10
        )
      );
      assert.equal(initializedTime.toNumber(), currentTime);
      assert.equal(initializedBlock.toNumber(), latestBlockNumber);
    });
    it("throws when controller of aix is not contribution", async function() {
      await expectThrow(
        contribution.initialize(
          apt.address,
          exchanger.address,
          multiSig,
          _remainderHolder,
          _devHolder,
          _communityHolder,
          collector,
          collectorWeiCap,
          totalCap,
          currentTime + 1,
          currentTime + 10
        )
      );
      const initializedTime = await contribution.initializedTime();
      const initializedBlock = await contribution.initializedBlock();
      assert.equal(initializedTime.toNumber(), 0);
      assert.equal(initializedBlock.toNumber(), 0);
    });
    it("throws startTime is less then currentTime", async function() {
      await aix.changeController(contribution.address);
      await expectThrow(
        contribution.initialize(
          apt.address,
          exchanger.address,
          multiSig,
          _remainderHolder,
          _devHolder,
          _communityHolder,
          collector,
          collectorWeiCap,
          totalCap,
          currentTime - 1,
          currentTime + 10
        )
      );
      const initializedTime = await contribution.initializedTime();
      const initializedBlock = await contribution.initializedBlock();
      assert.equal(initializedTime.toNumber(), 0);
      assert.equal(initializedBlock.toNumber(), 0);
    });
    it("throws totalWeiCap is 0", async function() {
      await aix.changeController(contribution.address);
      await expectThrow(
        contribution.initialize(
          apt.address,
          exchanger.address,
          multiSig,
          _remainderHolder,
          _devHolder,
          _communityHolder,
          collector,
          collectorWeiCap,
          0,
          currentTime + 1,
          currentTime + 10
        )
      );
      const initializedTime = await contribution.initializedTime();
      const initializedBlock = await contribution.initializedBlock();
      assert.equal(initializedTime.toNumber(), 0);
      assert.equal(initializedBlock.toNumber(), 0);
    });
    it("throws when startTime > endTime", async function() {
      await aix.changeController(contribution.address);
      await expectThrow(
        contribution.initialize(
          apt.address,
          exchanger.address,
          multiSig,
          _remainderHolder,
          _devHolder,
          _communityHolder,
          collector,
          collectorWeiCap,
          totalCap,
          currentTime + 11,
          currentTime + 1
        )
      );
      const initializedTime = await contribution.initializedTime();
      const initializedBlock = await contribution.initializedBlock();
      assert.equal(initializedTime.toNumber(), 0);
      assert.equal(initializedBlock.toNumber(), 0);
    });

    it("White and blacklisting investors", async function() {
      let investor = "0x0000000000000000000000000000000000000123";
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
  describe("#exchangeRate", async function() {
    beforeEach(async function() {
      const tokenFactory = await MiniMeTokenFactory.new();
      const tokenFactoryAPT = await MiniMeTokenFactory.new();
      apt = await APT.new(tokenFactoryAPT.address);
      await apt.generateTokens(owner, tokensPreSold);
      aix = await AIX.new(tokenFactory.address);
      contribution = await MockContribution.new(aix.address);
      exchanger = await Exchanger.new(
        apt.address,
        aix.address,
        contribution.address
      );

      multiSig = owner;
      totalCap = new BigNumber(60 * 10 ** 18); //59 eth
      collectorWeiCap = totalCap.div(10);
      sendingAmount = new BigNumber(1 * 10 ** 18); // 1 eth
      currentTime = getTime();
      _remainderHolder = "0x0039F22efB07A647557C7C5d17854CFD6D489eF1";
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
        _remainderHolder,
        _devHolder,
        _communityHolder,
        collector,
        collectorWeiCap,
        totalCap,
        currentTime + 1,
        currentTime + duration.weeks(1)
      );
    });
    it("calculates different discount rates based on time ", async function() {
      //first hour
      let exchnageRate = await contribution.exchangeRate();
      assert.equal(exchnageRate.toNumber(), 2300); //15% bonus. 1eth = 2300 aix
      // second hour
      await contribution.setBlockTimestamp(currentTime + duration.hours(2));
      exchnageRate = await contribution.exchangeRate();
      assert.equal(exchnageRate.toNumber(), 2200); //10% bonus. 1eth = 2200 aix

      //after 2 hr.
      await contribution.setBlockTimestamp(
        currentTime + duration.hours(2) + duration.minutes(1)
      );
      exchnageRate = await contribution.exchangeRate();
      assert.equal(exchnageRate.toNumber(), 2000); // 0% discount

      await contribution.whitelistAddresses([owner]);

      let totalWei = await contribution.totalWeiToCollect();
      await contribution.sendTransaction({
        from: owner,
        value: sendingAmount.mul(10)
      });
      totalWei = await contribution.totalWeiToCollect();
    });

    it("calculates different bonuses based on percentage", async function() {
      await contribution.setBlockTimestamp(
        currentTime + duration.days(2) + duration.minutes(4)
      );
      let toFund = await contribution.weiToCollect();

      // invest 10% of total
      // Should get 15% bonus
      await contribution.sendTransaction({
        from: owner,
        value: toFund.toNumber() * 10 / 100
      });
      let raised = await aix.balanceOf(owner);
      assert.equal(
        raised.toNumber(),
        toFund
          .mul(10 * 2300)
          .div(100)
          .toNumber()
      );

      // invest 15% of total
      // Should get 15% bonus on the first 10%
      //        get 10% bonus on the last 5%
      await contribution.sendTransaction({
        from: owner,
        value: toFund.toNumber() * 15 / 100
      });

      raised = await aix.balanceOf(owner);
      assert.equal(
        raised.toNumber(),
        toFund
          .mul(5 * 2200 + 20 * 2300)
          .div(100)
          .toNumber()
      );

      // invest 15% of total
      // Should get 10% bonus on the first 5%
      //        get no bonus on the last 10%
      await contribution.sendTransaction({
        from: owner,
        value: toFund.toNumber() * 15 / 100
      });

      raised = await aix.balanceOf(owner);
      assert.equal(
        raised.toNumber(),
        toFund
          .mul(10 * 2000 + 10 * 2200 + 20 * 2300)
          .div(100)
          .toNumber()
      );

      // invest 70% of total
      // Should get no bonus on the first 60%
      //        get 10% returned
      await contribution.sendTransaction({
        from: owner,
        value: toFund.toNumber() * 70 / 100
      });

      raised = await aix.balanceOf(owner);
      assert.equal(
        raised.toNumber(),
        toFund
          .mul(70 * 2000 + 10 * 2200 + 20 * 2300)
          .div(100)
          .toNumber()
      );
    });
  });

  describe("#proxyPayment", async function() {
    beforeEach(async function() {
      const tokenFactory = await MiniMeTokenFactory.new();
      const tokenFactoryAPT = await MiniMeTokenFactory.new();
      apt = await APT.new(tokenFactoryAPT.address);
      await apt.generateTokens(owner, tokensPreSold);
      aix = await AIX.new(tokenFactory.address);
      contribution = await MockContribution.new(aix.address);
      exchanger = await Exchanger.new(
        apt.address,
        aix.address,
        contribution.address
      );

      multiSig = addresses[0];
      totalCap = new BigNumber(1000 * 10 ** 18); //1000 eth
      collectorWeiCap = totalCap.div(10);
      sendingAmount = new BigNumber(1 * 10 ** 18); // 1 eth
      currentTime = getTime();
      _remainderHolder = "0x0039F22efB07A647557C7C5d17854CFD6D489eF1";
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
        _remainderHolder,
        _devHolder,
        _communityHolder,
        collector,
        collectorWeiCap,
        totalCap,
        currentTime + duration.seconds(2),
        currentTime + duration.weeks(1)
      );
    });
    it("happy path with fallback", async function() {
      assert.isFalse(await contribution.canPurchase(owner));
      await contribution.setBlockTimestamp(currentTime + duration.minutes(2));
      await contribution.setBlockNumber(latestBlockNumber + 10);
      await contribution.whitelistAddresses([
        owner,
        miner,
        _remainderHolder,
        _devHolder
      ]);
      let weiToCollect = await contribution.investorWeiToCollect(owner);
      await contribution.sendTransaction({
        from: owner,
        value: sendingAmount.mul(4)
      });
      await contribution.sendTransaction({
        from: miner,
        value: sendingAmount.mul(2)
      });
      const individualWeiCollected = await contribution.individualWeiCollected(
        owner
      );
      let totalWeiCollected = await contribution.totalWeiCollected();
      const newtotal = sendingAmount.mul(4).add(sendingAmount.mul(2));
      assert.equal(totalWeiCollected.toString(10), newtotal.toString(10));
      assert.equal(
        individualWeiCollected.toString(10),
        sendingAmount.mul(4).toString(10)
      );
      const balanceOfOwner = await aix.balanceOf(owner);
      const balanceOfMiner = await aix.balanceOf(miner);
      assert.equal(balanceOfOwner.toNumber(), sendingAmount.mul(4).mul(2300));
      assert.equal(balanceOfMiner.toNumber(), sendingAmount.mul(2).mul(2300));
    });

    it("throws when below sendingAmount", async function() {
      await contribution.setBlockTimestamp(currentTime + duration.minutes(2));
      await contribution.setBlockNumber(latestBlockNumber + 10);
      await contribution.whitelist(owner);
      await expectThrow(
        contribution.sendTransaction({ from: owner, value: 1 })
      );
      const balanceOfOwner = await aix.balanceOf(owner);
      assert.equal(balanceOfOwner.toNumber(), 0);
    });

    it("accepts 0.01 ether", async function() {
      const minPerTx = web3.toWei(0.01, "ether");
      await contribution.setBlockTimestamp(currentTime + duration.minutes(2));
      await contribution.setBlockNumber(latestBlockNumber + 10);
      await contribution.whitelist(owner);
      await contribution.sendTransaction({ from: owner, value: minPerTx });
      const balanceOfOwner = await aix.balanceOf(owner);
      assert.equal(
        balanceOfOwner.toNumber(),
        new BigNumber(minPerTx).mul(2300).toString(10)
      );
    });

    it("allows multisig to buy tokens", async function() {
      const MultiSigWallet = artifacts.require("MultiSigWallet");
      const multiSig = await MultiSigWallet.new([miner, owner], 1);
      await contribution.setBlockTimestamp(currentTime + duration.minutes(2));
      await contribution.setBlockNumber(latestBlockNumber + 10);

      await web3.eth.sendTransaction({
        from: miner,
        to: multiSig.address,
        value: new BigNumber(10 ** 18)
      });
      await contribution.whitelistAddresses([multiSig.address]);

      let totalWeiCollected = await contribution.totalWeiCollected();
      assert.equal(totalWeiCollected.toString(10), "0");

      const amountToSendFromMultiSig = new BigNumber(10 ** 18 * 0.5);
      await multiSig.submitTransaction(
        contribution.address,
        amountToSendFromMultiSig,
        "0x0"
      );
      const individualWeiCollected = await contribution.individualWeiCollected(
        multiSig.address
      );
      totalWeiCollected = await contribution.totalWeiCollected();

      const newtotal = amountToSendFromMultiSig;

      assert.equal(
        totalWeiCollected.toString(10),
        newtotal.toString(10),
        "totalWeiCollected is incorrect"
      );

      const balanceOf = await aix.balanceOf(multiSig.address);
      assert.equal(
        balanceOf.toString(10),
        amountToSendFromMultiSig.mul(2300).toString(10)
      );
    });
    it("contribution wallet should receive funds", async function() {
      const contWallBalanceBefore = await web3.eth.getBalance(multiSig);
      const investor = web3.eth.accounts[2];
      await contribution.setBlockTimestamp(currentTime + duration.minutes(2));
      await contribution.setBlockNumber(latestBlockNumber + 10);
      await contribution.whitelistAddresses([investor, ...addresses]);
      await contribution.sendTransaction({
        from: investor,
        value: sendingAmount.mul(2.5)
      });
      const contWallBalanceAfter = await web3.eth.getBalance(multiSig);
      const received = contWallBalanceAfter.sub(contWallBalanceBefore);
      assert.equal(
        received.toString(10),
        sendingAmount.mul(2.5),
        "contribution wallet should receive investor funds"
      );
    });

    it("throws when endDate is reached", async function() {
      await contribution.whitelistAddresses([owner]);
      await contribution.setBlockTimestamp(currentTime + duration.weeks(3));
      await expectThrow(
        contribution.sendTransaction({
          from: owner,
          value: totalCap
        })
      );
    });

    it("sends change back to investors if he buys more than cap", async function() {
      let ownerBalance = await web3.eth.getBalance(owner);
      await web3.eth.sendTransaction({
        from: owner,
        to: miner,
        gas: 21000,
        value: ownerBalance.sub(21000)
      });
      ownerBalance = await web3.eth.getBalance(owner);
      assert.equal(
        ownerBalance.toString(10),
        0,
        "owner should not have any money left"
      );
      await web3.eth.sendTransaction({
        from: miner,
        to: owner,
        value: totalCap.mul(2)
      });
      ownerBalance = await web3.eth.getBalance(owner);
      await contribution.setBlockTimestamp(currentTime + duration.days(2));
      await contribution.setBlockNumber(latestBlockNumber + 10);
      await contribution.whitelistAddresses([owner]);
      let investorWeiToCollect = await contribution.investorWeiToCollect(owner);
      assert.equal(investorWeiToCollect.toString(10), totalCap.toString(10));

      const txReceipt = await contribution.sendTransaction({
        from: owner,
        value: totalCap.mul(1.8)
      });
      const totalWeiCap = await contribution.totalWeiCap();
      const totalWeiToCollect = await contribution.totalWeiToCollect();
      const totalWeiCollected = await contribution.totalWeiCollected();

      ownerBalance = await web3.eth.getBalance(owner);

      const totalCapMinusExpenses = totalCap
        .sub(txReceipt.receipt.gasUsed)
        .toString(10);
      assert.equal(ownerBalance.toString(10), totalCapMinusExpenses);
      assert.equal(totalWeiToCollect.toString(10), 0);
    });
  });

  describe("the rest", async function() {
    beforeEach(async function() {
      await web3.eth.sendTransaction({
        from: miner,
        to: owner,

        value: totalCap
      });
      const tokenFactory = await MiniMeTokenFactory.new();
      const tokenFactoryAPT = await MiniMeTokenFactory.new();
      aix = await AIX.new(tokenFactory.address);
      apt = await APT.new(tokenFactoryAPT.address);
      contribution = await MockContribution.new(aix.address);
      exchanger = await Exchanger.new(
        apt.address,
        aix.address,
        contribution.address
      );

      multiSig = owner;
      totalCap = new BigNumber(510 * 10 ** 18); //510 eth
      collectorWeiCap = totalCap.div(10);
      sendingAmount = new BigNumber(10 ** 18); // 1 eth
      currentTime = getTime();
      _remainderHolder = "0x0039F22efB07A647557C7C5d17854CFD6D489eF1";
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
        _remainderHolder,
        _devHolder,
        _communityHolder,
        collector,
        collectorWeiCap,
        totalCap,
        currentTime + 1,
        currentTime + duration.weeks(1)
      );
    });
    it("#weiToCollect(investor) within first day sets a cap for every investor", async function() {
      await contribution.setBlockTimestamp(currentTime + 2);
      await contribution.whitelistAddresses([miner]);
      let investorCap = await contribution.investorWeiToCollect(owner);
      assert.equal(investorCap.toString(10), totalCap.toString(10));

      await contribution.whitelistAddresses([owner]);
      investorCap = await contribution.investorWeiToCollect(owner);
      assert.equal(investorCap.toString(10), totalCap.div(2).toString(10));

      await contribution.setBlockTimestamp(currentTime + duration.days(2));
      investorCap = await contribution.investorWeiToCollect(owner);
      assert.equal(investorCap.toString(10), totalCap.toString(10));

      await contribution.sendTransaction({
        from: owner,
        value: totalCap
      });
      investorCap = await contribution.investorWeiToCollect(owner);
      assert.equal(investorCap.toString(10), 0);
    });
    it("#weiToCollect() returns remaining cap", async function() {
      let totalLeftToCollect = await contribution.totalWeiToCollect();
      assert.equal(totalLeftToCollect.toString(10), totalCap.toString(10));
      await contribution.whitelistAddresses([owner]);
      await contribution.setBlockTimestamp(currentTime + 2);
      await contribution.sendTransaction({
        from: owner,
        value: sendingAmount
      });
      totalLeftToCollect = await contribution.totalWeiToCollect();
      assert.equal(
        totalLeftToCollect.toString(10),
        totalCap.sub(sendingAmount).toString(10)
      );

      await contribution.sendTransaction({
        from: owner,
        value: totalCap
      });
      totalLeftToCollect = await contribution.totalWeiToCollect();
      assert.equal(totalLeftToCollect.toString(10), 0);
    });

    it("pauses contribution", async function() {
      let controller = await contribution.controller();
      let paused = await contribution.paused();
      assert.equal(paused, false);
      await expectThrow(contribution.pauseContribution(true, { from: owner }));
      paused = await contribution.paused();
      assert.equal(paused, false);

      await contribution.pauseContribution(true, { from: controller });
      paused = await contribution.paused();
      assert.equal(paused, true);

      await contribution.whitelistAddresses([owner]);
      await contribution.setBlockTimestamp(currentTime + 2);
      await expectThrow(
        contribution.sendTransaction({
          from: owner,
          value: sendingAmount
        })
      );
      const balanceOf = await aix.balanceOf(owner);
      assert.equal(balanceOf.toString(10), 0);
    });
    describe("#allowTransfers", async function() {
      it("if false, no transfers should be allowed", async function() {
        let transferable = await contribution.transferable();
        assert.equal(transferable, false);

        await expectThrow(contribution.allowTransfers(true, { from: owner }));
        transferable = await contribution.transferable();
        assert.equal(transferable, false);

        await contribution.allowTransfers(true);
        transferable = await contribution.transferable();
        assert.equal(transferable, true);

        await contribution.whitelistAddresses([owner]);
        await contribution.setBlockTimestamp(currentTime + 2);
        await contribution.sendTransaction({
          from: owner,
          value: sendingAmount
        });

        let minerBalance = await aix.balanceOf(miner);
        assert.equal(minerBalance.toString(10), 0);
        await aix.transfer(miner, 1, { from: owner });
        minerBalance = await aix.balanceOf(miner);
        assert.equal(minerBalance.toString(10), 1);

        await contribution.allowTransfers(false);
        await expectThrow(aix.transfer(miner, 1, { from: owner }));
        minerBalance = await aix.balanceOf(miner);
        assert.equal(minerBalance.toString(10), 1);
      });
    });
    describe("#finalize", async function() {
      it("can only be called once", async function() {
        let finalizedTime = await contribution.finalizedTime();
        assert.equal(finalizedTime.toString(10), 0);
        await contribution.setBlockTimestamp(currentTime + 2);
        await contribution.finalize();
        finalizedTime = await contribution.finalizedTime();
        assert.equal(finalizedTime.toString(10), currentTime + 2);

        await expectThrow(contribution.finalize());
        finalizedTime = await contribution.finalizedTime();
        assert.equal(finalizedTime.toString(10), currentTime + 2);
      });
      it("can be called by anyone after endTime", async function() {
        let finalizedTime = await contribution.finalizedTime();
        assert.equal(finalizedTime.toString(10), 0);
        await contribution.setBlockTimestamp(currentTime + 2);
        await expectThrow(contribution.finalize({ from: owner }));
        finalizedTime = await contribution.finalizedTime();
        assert.equal(finalizedTime.toString(10), 0);

        await contribution.setBlockTimestamp(currentTime + duration.weeks(3));
        await contribution.finalize({ from: owner });
        finalizedTime = await contribution.finalizedTime();
        assert.equal(
          finalizedTime.toString(10),
          currentTime + duration.weeks(3)
        );
      });
      it("can be called when cap is met by anyone", async function() {
        let finalizedTime = await contribution.finalizedTime();
        assert.equal(finalizedTime.toString(10), 0);

        await contribution.whitelistAddresses([owner]);
        await contribution.setBlockTimestamp(currentTime + 2);
        await contribution.sendTransaction({
          from: owner,
          value: totalCap.add(210000)
        });

        let totalWeiToCollect = await contribution.totalWeiToCollect();
        assert.equal(totalWeiToCollect.toString(10), 0);
        await contribution.finalize({ from: owner });
        finalizedTime = await contribution.finalizedTime();
        assert.equal(finalizedTime.toString(10), currentTime + 2);
      });
      it("generates tokens to wallets", async function() {
        let finalizedTime = await contribution.finalizedTime();
        assert.equal(finalizedTime.toString(10), 0);

        await contribution.whitelistAddresses([owner]);
        await contribution.setBlockTimestamp(currentTime + duration.days(2));
        const amountToSend = new BigNumber(51 * 10 ** 18);
        let totalSupply = await aix.totalSupply();
        await contribution.sendTransaction({
          from: owner,
          value: totalCap
        });

        totalSupply = await aix.totalSupply();
        let expectedSupply = totalSupply.mul(100).div(51);
        await contribution.finalize();
        totalSupply = await aix.totalSupply();
        assert.equal(
          expectedSupply.toFixed(0),
          totalSupply.toString(10),
          "totalSupply is not correct"
        );

        const remainderBalance = await aix.balanceOf(_remainderHolder);
        const devBalance = await aix.balanceOf(_devHolder);
        const communityBalance = await aix.balanceOf(_communityHolder);
        assert.equal(remainderBalance.toString(10), 0, "remainder is not 0");
        assert.equal(
          devBalance.toString(10),
          totalSupply
            .mul(20)
            .div(100)
            .toString(10),
          "devbalance is not correct"
        );
        assert.equal(
          communityBalance.toString(10),
          totalSupply
            .mul(29)
            .div(100)
            .toString(10),
          "community is not correct"
        );
      });
    });
  });

  describe("#whitelistAddresses", async function() {
    beforeEach(async function() {
      const tokenFactory = await MiniMeTokenFactory.new();
      aix = await AIX.new(tokenFactory.address);
      contribution = await MockContribution.new(aix.address);
    });
    it("should whitelist an array of addresses", async function() {
      assert.isFalse(await contribution.canPurchase(owner));
      assert.isFalse(await contribution.canPurchase(miner));
      await contribution.whitelistAddresses([owner, miner, ...addresses]);
      assert.isTrue(await contribution.canPurchase(owner));
      assert.isTrue(await contribution.canPurchase(miner));
      assert.isTrue(
        await contribution.canPurchase(addresses[addresses.length - 1])
      );
      await contribution.blacklistAddresses([owner, miner, ...addresses]);
      assert.isFalse(await contribution.canPurchase(owner));
      assert.isFalse(await contribution.canPurchase(miner));
      assert.isFalse(
        await contribution.canPurchase(addresses[addresses.length - 1])
      );
    });

    it("can only be called from controller", async function() {
      await expectThrow(
        contribution.whitelistAddresses([owner, miner, ...addresses], {
          from: investor
        })
      );
      await expectThrow(
        contribution.blacklistAddresses([owner, miner, ...addresses], {
          from: investor
        })
      );
    });

    it("increments numWhitelistedInvestors when whitelisted", async function() {
      let numWhitelistedInvestors = await contribution.numWhitelistedInvestors();
      assert.equal(numWhitelistedInvestors.toNumber(), 0);
      await contribution.whitelistAddresses([owner, miner]);
      numWhitelistedInvestors = await contribution.numWhitelistedInvestors();
      assert.equal(numWhitelistedInvestors.toNumber(), 2);
      await contribution.whitelistAddresses([owner, miner]);
      assert.equal(numWhitelistedInvestors.toNumber(), 2);
      await contribution.whitelistAddresses([addresses[0]]);
      numWhitelistedInvestors = await contribution.numWhitelistedInvestors();
      assert.equal(numWhitelistedInvestors.toNumber(), 3);
    });
    it("decrements numWhitelistedInvestors when blacklisted", async function() {
      let numWhitelistedInvestors = await contribution.numWhitelistedInvestors();
      assert.equal(numWhitelistedInvestors.toNumber(), 0);
      await contribution.blacklistAddresses([owner, miner]);
      numWhitelistedInvestors = await contribution.numWhitelistedInvestors();
      assert.equal(numWhitelistedInvestors.toNumber(), 0);
      await contribution.whitelistAddresses([owner, miner]);
      numWhitelistedInvestors = await contribution.numWhitelistedInvestors();
      assert.equal(numWhitelistedInvestors.toNumber(), 2);
      await contribution.blacklistAddresses([owner]);
      numWhitelistedInvestors = await contribution.numWhitelistedInvestors();
      assert.equal(numWhitelistedInvestors.toNumber(), 1);
      numWhitelistedInvestors = await contribution.numWhitelistedInvestors();
      await contribution.blacklistAddresses([owner]);
      assert.equal(numWhitelistedInvestors.toNumber(), 1);
    });
  });
});
