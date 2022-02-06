import { readFileSync } from "fs";
import { parse } from "./index";

console.log(parse(readFileSync("package.json").toString()));

