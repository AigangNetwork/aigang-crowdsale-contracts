var MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
var AIT = artifacts.require("AIT");
var SafeMath = artifacts.require("SafeMath");
var PreSale = artifacts.require("PreSale");

module.exports = async function(deployer) {
  await deployer.deploy(MiniMeTokenFactory);
  await deployer.deploy(AIT, MiniMeTokenFactory.address);
  deployer.deploy(SafeMath);
  deployer.link(SafeMath, PreSale);
  await deployer.deploy(PreSale, AIT.address);
  AIT.deployed().changeController(PreSale.address);
};
