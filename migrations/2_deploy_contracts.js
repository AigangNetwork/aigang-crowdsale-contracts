uvar MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
var APT = artifacts.require("APT");
var PlaceHolder = artifacts.require("PlaceHolder");
var SafeMath = artifacts.require("SafeMath");
var PreSale = artifacts.require("PreSale");
var PreSaleWallet = artifacts.require("PreSaleWallet");

module.exports = function(deployer, chain, accounts) {
  deployer.deploy(SafeMath).then((i) => {
    return deployer.deploy(MiniMeTokenFactory)
  }).then(()=> {
    return deployer.deploy(APT, MiniMeTokenFactory.address)
  }).then(()=> {
    return deployer.deploy(PlaceHolder, APT.address)
  }).then(()=> {
    return deployer.link(SafeMath, PreSale)
  }).then(()=> {
    return deployer.deploy(PreSale, APT.address, PlaceHolder.address)
  }).then(()=> {
    return APT.deployed()
  }).then((i) => {
    i.changeController(PreSale.address)
  });
};
