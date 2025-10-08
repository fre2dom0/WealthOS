import type { HardhatUserConfig } from "hardhat/config";
import hardhatVerify from "@nomicfoundation/hardhat-verify";

import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable } from "hardhat/config";
import 'dotenv/config';

const config: HardhatUserConfig = {
	plugins: [
		hardhatToolboxViemPlugin,
		hardhatVerify,
	],
	solidity: {
		profiles: {
			default: {
				version: "0.8.30",
				settings: {
					viaIR: true,
					optimizer: {
						enabled: true,
						runs: 200,
					},
				},
			},
			production: {
				version: "0.8.30",
				settings: {
					viaIR: true,
					optimizer: {
						enabled: true,
						runs: 200,
					},
				},
			},
		},
	},
	networks: {
		hardhatMainnet: {
			type: "edr-simulated",
			chainType: "l1",
		},
		hardhatOp: {
			type: "edr-simulated",
			chainType: "op",
		},
		sepolia: {
			type: "http",
			chainType: "l1",
			url: configVariable("SEPOLIA_RPC_URL"),
			accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
		},
	},
	verify: {
		etherscan: {
			apiKey: process.env.ETHERSCAN_API
		}
	}
};

export default config;
