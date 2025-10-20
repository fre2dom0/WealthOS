CREATE TABLE static.contracts (
    address VARCHAR(42) CONSTRAINT pk_address PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(250)
);

COMMENT ON TABLE static.contracts IS 'Includes constant contract informations.';
COMMENT ON COLUMN static.contracts.address IS 'Unique 42 characters blockchain address of the contract.';
COMMENT ON COLUMN static.contracts.name IS 'Unique max 100 characters name of the contract.';
COMMENT ON COLUMN static.contracts.description IS 'Max 250 characters description of the contract.';

CREATE TABLE static.function_selectors (
    contract_address VARCHAR(42) NOT NULL REFERENCES static.contracts(address) ON DELETE CASCADE,
    function_selector VARCHAR(10) PRIMARY KEY,
    function VARCHAR(50) NOT NULL,
    description VARCHAR(250)
);

COMMENT ON TABLE static.function_selectors IS 'Includes function selectors of all contracts.';
COMMENT ON COLUMN static.function_selectors.contract_address IS '42 characters blockchain address of the contract.';
COMMENT ON COLUMN static.function_selectors.function_selector IS '10 characters Function selector of the contract address. Unique per contract.';
COMMENT ON COLUMN static.function_selectors.function IS 'Max 50 characters name of function selector in human readable format';
COMMENT ON COLUMN static.function_selectors.description IS 'Max 250 characters description of the function selector.';

-- ------------------------------------------------------------------------------------------------------------------------

CREATE TABLE public.user_function_selector_approvals (
    user_address VARCHAR(42) NOT NULL,
    function_selector VARCHAR(10) NOT NULL REFERENCES static.function_selectors(function_selector) ON DELETE CASCADE,
    UNIQUE (user_address, function_selector)
);

COMMENT ON TABLE public.user_function_selector_approvals IS 'Includes function approvals of user.';
COMMENT ON COLUMN public.user_function_selector_approvals.user_address IS '42 characters blockchain address of user.';
COMMENT ON COLUMN public.user_function_selector_approvals.function_selector IS '10 characters function selector that user approved.';

-- ------------------------------------------------------------------------------------------------------------------------

CREATE TABLE events.approved (
    topics VARCHAR(66)[] NOT NULL,
    data TEXT NOT NULL,
    block_hash VARCHAR(66),
    block_number BIGINT,
    block_timestamp BIGINT,
    transaction_hash VARCHAR(66) PRIMARY KEY,
    transaction_index  INTEGER NOT NULL,
    log_index  INTEGER NOT NULL,
    removed BOOLEAN NOT NULL,
    stored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    args JSONB NOT NULL
)


CREATE TABLE events.revoked (
    topics VARCHAR(66)[] NOT NULL,
    data TEXT NOT NULL,
    block_hash VARCHAR(66),
    block_number BIGINT,
    block_timestamp BIGINT,
    transaction_hash VARCHAR(66) PRIMARY KEY,
    transaction_index  INTEGER NOT NULL,
    log_index  INTEGER NOT NULL,
    removed BOOLEAN NOT NULL,
    stored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    args JSONB NOT NULL
)


CREATE TABLE events.executed (
    topics VARCHAR(66)[] NOT NULL,
    data TEXT NOT NULL,
    block_hash VARCHAR(66),
    block_number BIGINT,
    block_timestamp BIGINT,
    transaction_hash VARCHAR(66) PRIMARY KEY,
    transaction_index  INTEGER NOT NULL,
    log_index  INTEGER NOT NULL,
    removed BOOLEAN NOT NULL,
    stored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    args JSONB NOT NULL
)