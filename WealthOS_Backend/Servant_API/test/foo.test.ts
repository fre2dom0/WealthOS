import { describe, expect, it } from "vitest";

export function sum(a: number, b: number) {
  return a + b;
}

describe("sum function", () => {
  it("should add two positive numbers correctly", () => {
    expect(sum(1, 2)).toBe(3);
  });
});