#!/usr/bin/env bash

#pip3 install solidity-flattener --no-cache-dir -U
solidity_flattener contracts/AIX.sol --out flat/AIX_flat.sol
solidity_flattener contracts/APT.sol --out flat/APT_flat.sol
solidity_flattener contracts/CommunityTokenHolder.sol --out flat/CommunityTokenHolder_flat.sol
solidity_flattener contracts/Contribution.sol --out flat/Contribution_flat.sol

solidity_flattener contracts/DevTokensHolder.sol --out flat/DevTokensHolder_flat.sol
solidity_flattener contracts/Exchanger.sol --out flat/Exchanger_flat.sol
solidity_flattener contracts/RemainderTokenHolder.sol --out flat/RemainderTokenHolder_flat.sol
