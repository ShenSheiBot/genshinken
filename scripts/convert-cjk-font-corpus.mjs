import fs from "node:fs";
import { ConverterBuilder } from "opencc-js/core";
import * as cn2t from "opencc-js/preset/cn2t";
import * as t2cn from "opencc-js/preset/t2cn";

const source = fs.readFileSync(0, "utf8");
const simplifiedToTraditional = ConverterBuilder(cn2t)({ from: "cn", to: "t" });
const traditionalToSimplified = ConverterBuilder(t2cn)({ from: "t", to: "cn" });

process.stdout.write(simplifiedToTraditional(source));
process.stdout.write("\n");
process.stdout.write(traditionalToSimplified(source));
