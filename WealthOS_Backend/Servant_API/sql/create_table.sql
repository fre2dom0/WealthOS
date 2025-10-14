CREATE TABLE static.contracts (
    address VARCHAR(42) CONSTRAINT pk_address PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(250)
);

COMMENT ON TABLE static.contracts IS 'Includes constant contract informations.';
COMMENT ON COLUMN static.contracts.address IS 'Unique 42 character blockchain address of the contract.';
COMMENT ON COLUMN static.contracts.name IS 'Unique 100 character name of the contract.';
COMMENT ON COLUMN static.contracts.description IS '250 character description of the contract.';

-- ------------------------------------------------------------------------------------------------------------------------

CREATE TABLE static.function_selectors (
    contract_address VARCHAR(42) NOT NULL REFERENCES static.contracts(address) ON DELETE CASCADE,
    function_selector VARCHAR(10) PRIMARY KEY,
    description VARCHAR(250)
);

COMMENT ON TABLE static.function_selectors IS 'Includes function selectors of all contracts.';
COMMENT ON COLUMN static.function_selectors.contract_address IS '42 character blockchain address of the contract.';
COMMENT ON COLUMN static.function_selectors.function_selector IS 'Function selector of the contract address. Unique per contract.';
COMMENT ON COLUMN static.function_selectors.description IS '250 character description of the function selector.';

-- ------------------------------------------------------------------------------------------------------------------------

CREATE TABLE public.user_function_selector_approvals (
    user_address VARCHAR(42) NOT NULL,
    function_selector VARCHAR(10) NOT NULL REFERENCES static.function_selectors(function_selector),
    UNIQUE (user_address, function_selector)
);

COMMENT ON TABLE public.user_function_selector_approvals IS 'Includes function approvals of user.';
COMMENT ON COLUMN public.user_function_selector_approvals.user_address IS '42 character blockchain address of user.';
COMMENT ON COLUMN public.user_function_selector_approvals.function_selector IS '10 character function selector that user approved.';

