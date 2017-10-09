module.exports = {
    norpc: true,
    testCommand: 'node --max-old-space-size=4096 ../node_modules/.bin/truffle test --network coverage',
    skipFiles: ['Migrations.sol', 'ERC20.sol', 'MiniMeToken.sol', 'MultiSigWallet.sol', 'SafeMath.sol']
}