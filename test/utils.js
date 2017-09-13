export async function expectThrow(promise) {
    try {
        const networkId = web3.version.network;
        let txReceipt;
        // for testrpc: dev and coverage mode
        if (networkId === '123' || networkId === '321') {
            txReceipt = await assert.isRejected(promise);
        } else {
            // for geth node
            txReceipt = await promise;
        }
        return txReceipt;
    } catch (error) {
        // TODO: Check jump destination to destinguish between a throw
        //       and an actual invalid jump.
        const invalidOpcode = error.message.search('invalid opcode') >= 0;
        // TODO: When we contract A calls contract B, and B throws, instead
        //       of an 'invalid jump', we get an 'out of gas' error. How do
        //       we distinguish this from an actual out of gas event? (The
        //       testrpc log actually show an 'invalid jump' event.)
        const outOfGas = error.message.search('out of gas') >= 0;
        assert(
            invalidOpcode || outOfGas,
            "Expected throw, got '" + error + "' instead",
        );
        return;
    }
    assert.fail('Expected throw not received');
};

