type Wallet = {
    PUBLIC_KEY: string;
    PRIVATE_KEY: `0x${string}`;
}

export const WALLET: Wallet = {
    PUBLIC_KEY: '0x870B2Df642c696B6308497b029D9f2202f6ae6Dc',
    PRIVATE_KEY: '0xb9857adb42226df697a06a17d9d71715a5e56a4476d3865b8b0a306e784e9380',
}

export const SESSION_SIGNATURE = {
    message: 'Please sign the message to create user session. Nonce : '
}
