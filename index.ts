enum Types {
  NUMBER,
  STRING,
  BOOLEAN,
  NULL,
  LEFT_SQUARE,
  RIGHT_SQUARE,
  LEFT_BRACKET,
  RIGHT_BRACKET,
  COMMA,
  SEPARATOR,
}

interface Loc {
  line: number;
  column: number;
}

interface Token {
  value: string;
  type: Types;
  loc: Loc;
}

const helpers = {
  getLineString: (loc: Loc): string =>
    `${loc.line}:${parseInt(loc.column.toString())}`,
  getErrorMessage: (message: string, loc: Loc): string => {
    return `${message} at ${helpers.getLineString(loc)}`;
  },
};

class Tokeniser {
  private source: string;
  private index: number = 0;
  private tokens: Token[] = [];
  private line: number = 1;

  constructor(source: string) {
    this.source = source;
    this.index = 0;
    this.tokens = [];
  }

  /**
   * @private
   *
   * Add value to a token unless a certain given
   * condition is wrong or if we run out of tokens
   *
   * @param {Function} condition The condition which should be true
   * @returns {string} The token as a string
   */
  private make(condition: (char: string) => boolean): string {
    let value = "";
    while (this.source.length > this.index) {
      const character = this.source[this.index];
      if (!condition(character)) break;
      value += character;
      this.index += 1;
    }
    return value;
  }

  public tokenise(): Token[] {
    while (this.source.length > this.index) {
      const character = this.source[this.index];
      if (Number.isInteger(parseInt(character))) {
        // parseInt on strings which arent digits return NaN
        const num = this.make((char) => {
          return Number.isInteger(parseInt(char)) || char == ".";
        });
        const decimals = Array.from(num).filter((char) => char == ".").length;
        if (decimals > 1) {
          throw new Error(`Invalid number ${decimals}`);
        }
        this.tokens.push({
          value: num,
          type: Types.NUMBER,
          loc: {
            line: this.line,
            column: this.index / this.line,
          },
        });
        this.index -= 1;
      } else if (character == '"') {
        this.index += 1;
        this.tokens.push({
          value: this.make((char) => char != '"'),
          type: Types.STRING,
          loc: {
            line: this.line,
            column: this.index / this.line,
          },
        });
      } else if (/[a-zA-Z]/.test(character)) {
        // Matching for alphanumeric characters for identifiers
        // The identifier token is used for boolean and
        // null values
        const value = this.make((char): boolean => {
          const matches = char.match(/^[0-9a-zA-Z]+$/);
          if (!matches) return false;
          return matches.length > 0;
        });
        let type = Types.NULL;
        if (["true", "false"].includes(value)) {
          type = Types.BOOLEAN;
        } else if (value == "null") {
        } else {
          throw new Error(
            helpers.getErrorMessage(`Unknown value ${value}`, {
              line: this.line,
              column: this.index / this.line,
            })
          );
        }
        this.tokens.push({
          value: value,
          type: type,
          loc: {
            line: this.line,
            column: this.index / this.line,
          },
        });
        this.index -= 1;
      } else if (["{", "}"].includes(character)) {
        this.tokens.push({
          value: character,
          type: character == "{" ? Types.LEFT_BRACKET : Types.RIGHT_BRACKET,
          loc: {
            line: this.line,
            column: this.index / this.line,
          },
        });
      } else if (["[", "]"].includes(character)) {
        this.tokens.push({
          value: character,
          type: character == "[" ? Types.LEFT_SQUARE : Types.RIGHT_SQUARE,
          loc: {
            line: this.line,
            column: this.index / this.line,
          },
        });
      } else if (character == ",") {
        this.tokens.push({
          value: ",",
          type: Types.COMMA,
          loc: {
            line: this.line,
            column: this.index / this.line,
          },
        });
      } else if (character == ":") {
        this.tokens.push({
          value: ":",
          type: Types.SEPARATOR,
          loc: {
            line: this.line,
            column: this.index / this.line,
          },
        });
      } else if (character == "\n") {
        this.line += 1;
      }
      this.index += 1;
    }
    return this.tokens;
  }
}

interface Expression {
  type: "List" | "Object" | "Property";
}

interface ArrayExpression extends Expression {
  elements: Array<any>;
}

interface PropertyExpression extends Expression {
  key: any;
  value: any;
}

interface ObjectExpression extends Expression {
  // List of properties
  value: Array<PropertyExpression>;
}

class Parser {
  private tokens: Token[];
  private index: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private parseExpression(): any {
    const current = this.tokens[this.index];
    if (
      [Types.NUMBER, Types.STRING, Types.NULL, Types.BOOLEAN].includes(
        current.type
      )
    ) {
      return current;
    }
    if (current.type == Types.LEFT_BRACKET) {
      return this.parseDictionary();
    } else if (current.type == Types.LEFT_SQUARE) {
      return this.parseArrayExpression();
    }
  }

  /**
   * @private
   *
   * Parse array values(lists). An array expression
   * starts and ends with a square bracket and
   * the elements are separated by a comma
   * [3, 3, 4]
   *
   * @returns {ArrayExpression}
   */
  private parseArrayExpression(): ArrayExpression {
    let elements = [];
    let next = this.advance();
    while (next.type != Types.RIGHT_BRACKET) {
      if (this.tokens[this.index]?.type == Types.RIGHT_SQUARE) {
        break;
      }
      const value = this.parseExpression();
      if (!value) {
        throw new Error(
          helpers.getErrorMessage("Invalid element in array", next.loc)
        );
      }
      elements.push(value);
      const comma = this.advance();
      if (comma?.type == Types.RIGHT_SQUARE) break;
      if (comma?.type != Types.COMMA) {
        console.log(comma);
        throw new Error(helpers.getErrorMessage(`Expected a comma`, comma.loc));
      }
      next = this.advance();
      if (!next) {
        throw new Error(helpers.getErrorMessage(`Unexpected end`, comma.loc));
      }
    }
    return {
      type: "List",
      elements: elements,
    };
  }

  private parsePairExpression(current: Token): PropertyExpression {
    if (current.type != Types.STRING) {
      throw new Error(
        helpers.getErrorMessage(`Keys must be strings`, current.loc)
      );
    }
    const next = this.advance();
    if (!next || next.type != Types.SEPARATOR) {
      throw new Error(
        helpers.getErrorMessage(`Expected a separator`, next.loc)
      );
    }
    this.index += 1;
    const value = this.parseExpression();
    return {
      type: "Property",
      key: current,
      value: value,
    };
  }

  /**
   * @private
   *
   * Parse an object expression. An Object contains
   * a list of key value pairs
   * {"key":"value"}
   * @returns
   */
  private parseDictionary(): ObjectExpression {
    let next = this.advance();
    let value = { type: "Object", value: [] };
    // @ts-ignore
    if (!next) return value;
    while (next.type != Types.RIGHT_BRACKET) {
      const pair = this.parsePairExpression(next);
      // @ts-ignore
      value.value.push(pair);
      const comma = this.advance();

      if (!comma) break;
      if (comma.type == Types.RIGHT_BRACKET) break;
      if (![Types.COMMA, Types.RIGHT_BRACKET].includes(comma?.type)) {
        throw new Error(helpers.getErrorMessage(`Expected a comma`, comma.loc));
      }
      next = this.advance();
      if (!next) break;
    }
    // @ts-ignore
    return value;
  }

  /**
   * @private
   *
   * Increment the index by one and
   * return the token an the new index
   * @returns {Token}
   */
  private advance(): Token {
    this.index += 1;
    return this.tokens[this.index];
  }

  public parse(): any {
    return this.parseExpression();
  }
}

/**
 * @private
 *
 * Convert the ast into a JavaScript object
 * @param {any} ast
 * @returns {any} The JavaScript object
 */
const getObject = (ast: any) => {
  if (!["List", "Object"].includes(ast.type)) {
    throw new Error("Expected a list or object");
  }
  const parseExpression = (token: any) => {
    if (token.type == "List") {
      return token.elements.map((element: any): any => {
        return parseExpression(element);
      });
    } else if (token.type == Types.NUMBER) {
      const isFloat = token.value.includes(".");
      return isFloat ? parseFloat(token.value) : parseInt(token.value);
    } else if (token.type == Types.STRING) {
      return token.value;
    } else if (token.type == Types.NULL) {
      return null;
    } else if (token.type == Types.BOOLEAN) {
      return token.value == "true" ? true : false;
    } else if (token.type == "Object") {
      let value: { [key: string]: any } = {};
      for (const property of token.value) {
        const key = property.key.value;
        const keyValue = parseExpression(property.value);
        value[key] = keyValue;
      }
      return value;
    }
  };
  return parseExpression(ast);
};

/**
 * @public
 * @param {string} content
 * @returns {any}
 */
const parse = (content: string): any => {
  const tokeniser = new Tokeniser(content);
  const parser = new Parser(tokeniser.tokenise());
  const ast = parser.parse();
  return getObject(ast);
};

export { parse };

