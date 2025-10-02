import { describe, expect, it } from "vitest";

function sum(a: number, b: number) {
	return a + b;
}

function throwErr() {
	if (1 == 1) throw new Error('Universe is logical');
}

describe("sum function", () => {
	it("should add two positive numbers correctly", () => {
		expect(sum(1, 2)).to.be.equal(3);
	});
});

it('expect rejects toThrow', async ({ expect }) => {
  const promise = Promise.reject(new Error('Test'))
  await expect(promise).rejects.toThrowError()
})

it('expect throw error', async () => {
	expect(() => throwErr()).to.throw('Universe is logical');
})