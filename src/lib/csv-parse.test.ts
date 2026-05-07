import { describe, it, expect } from "vitest";
import { parseCsv } from "./csv-parse";

describe("parseCsv", () => {
  it("parses simple rows", () => {
    const { headers, rows } = parseCsv("name,phone\nAarav,9810000001\nIsha,9810000002");
    expect(headers).toEqual(["name", "phone"]);
    expect(rows).toEqual([
      { name: "Aarav", phone: "9810000001" },
      { name: "Isha", phone: "9810000002" },
    ]);
  });

  it("handles quoted commas", () => {
    const { rows } = parseCsv('name,address\n"Mehta, Aarav","Block A, Delhi"');
    expect(rows[0]).toEqual({ name: "Mehta, Aarav", address: "Block A, Delhi" });
  });

  it("handles escaped quotes", () => {
    const { rows } = parseCsv('name\n"He said ""hi"""');
    expect(rows[0]?.name).toBe('He said "hi"');
  });

  it("handles CRLF line endings", () => {
    const { rows } = parseCsv("a,b\r\n1,2\r\n3,4\r\n");
    expect(rows).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("strips BOM", () => {
    const { headers } = parseCsv("﻿name,phone\nA,1");
    expect(headers).toEqual(["name", "phone"]);
  });

  it("trims and lowercases header keys", () => {
    const { headers, rows } = parseCsv("Full Name, Phone \nAarav,9810");
    expect(headers).toEqual(["full name", "phone"]);
    expect(rows[0]).toEqual({ "full name": "Aarav", phone: "9810" });
  });
});
