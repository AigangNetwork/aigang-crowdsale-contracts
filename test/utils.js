const assert = require("chai").use(require("chai-as-promised")).assert;
export async function expectThrow(promise) {
  try {
    const networkId = web3.version.network;
    let txReceipt;
    // for testrpc: dev and coverage mode
    if (networkId === "123" || networkId === "321") {
      txReceipt = await assert.isRejected(promise);
    } else {
      // for geth node
      txReceipt = await promise;
    }
    return txReceipt;
  } catch (error) {
    // TODO: Check jump destination to destinguish between a throw
    //       and an actual invalid jump.
    const invalidOpcode = error.message.search("invalid opcode") >= 0;
    // TODO: When we contract A calls contract B, and B throws, instead
    //       of an 'invalid jump', we get an 'out of gas' error. How do
    //       we distinguish this from an actual out of gas event? (The
    //       testrpc log actually show an 'invalid jump' event.)
    const outOfGas = error.message.search("out of gas") >= 0;
    assert(
      invalidOpcode || outOfGas,
      "Expected throw, got '" + error + "' instead"
    );
    return;
  }
  assert.fail("Expected throw not received");
}

export function getTime() {
  return web3.eth.getBlock("latest").timestamp;
}

export const duration = {
  seconds: function(val) {
    return val;
  },
  minutes: function(val) {
    return val * this.seconds(60);
  },
  hours: function(val) {
    return val * this.minutes(60);
  },
  days: function(val) {
    return val * this.hours(24);
  },
  weeks: function(val) {
    return val * this.days(7);
  },
  years: function(val) {
    return val * this.days(365);
  }
};

export async function latestBlock() {
  return new Promise((resolve, reject) => {
    web3.eth.getBlockNumber((error, number) => {
      if (error) {
        reject(error);
      }
      resolve(number);
    });
  });
}
