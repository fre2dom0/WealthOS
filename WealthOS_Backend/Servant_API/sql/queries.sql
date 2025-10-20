-- GET CONTRACT ADDRESSES
SELECT * FROM static.contracts;
-- ADD NEW CONTRACT
INSERT INTO static.contracts (address, name, description) VALUES ($1, $2, $3);
-- REMOVE CONTRACT
DELETE FROM static.contracts WHERE address = $1;

-----------------------------------------------

-- GET FUNCTION SELECTORS
SELECT * FROM static.function_selectors ORDER BY contract_address, function;
-- GET FUNCTION SELECTORS ACCORDING TO CONTRACT ADDRESSES
SELECT * FROM static.function_selectors WHERE contract_address = $1 ORDER BY function;
-- ADD NEW FUNCTION SELECTOR
INSERT INTO static.function_selectors (contract_address, function_selector, function, description)  VALUES ($1, $2, $3, $4);
-- REMOVE FUNCTION SELECTOR
DELETE FROM static.function_selectors WHERE functiion_selector = $1;
-- REMOVE ALL FUNCTION SELECTORS OF A CONTRACT ADDRESS
DELETE FROM static.function_selectors WHERE contract_address = $1;

-----------------------------------------------

-- GET FUNCTION SELECTORS OF USER ACCORDING TO USER ADDRESS
SELECT * FROM public.user_functiion_selector_approvals WHERE user_address = $1