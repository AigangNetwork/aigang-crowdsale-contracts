var MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
var APT = artifacts.require("APT");
var PlaceHolder = artifacts.require("PlaceHolder");
var SafeMath = artifacts.require("SafeMath");
var PreSale = artifacts.require("PreSale");

module.exports = async function(deployer) {
  await deployer.deploy(SafeMath);
  await deployer.deploy(MiniMeTokenFactory);
  await deployer.deploy(APT, MiniMeTokenFactory.address);
  await deployer.deploy(PlaceHolder, APT.address);
  deployer.link(SafeMath, PreSale);
  await deployer.deploy(PreSale, APT.address, PlaceHolder.address);
  (await APT.deployed()).changeController(PreSale.address);
};
