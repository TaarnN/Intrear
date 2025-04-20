// ========================================
// Intrear AST Node Interpreter Core (v1.0)
// ========================================
//
// This file defines the complete AST node interpretation runtime, type system, and execution engine for the Intrear interpreter.
// It supports a statically typed, dynamically executed scripting model with first-class functions,
// control flow, type inference, and extensibility.
//
// ---------------------------------------------------
// 1. Type System - Type declarations, comparison, and utilities
// ---------------------------------------------------

export type Type =
  | "number"
  | "string"
  | "boolean"
  | "null"
  | "undefined"
  | "bigint"
  | "symbol"
  | "void"
  | "any"
  | { kind: "function"; paramTypes: Type[]; returnType: Type }
  | { kind: "array"; elementType: Type }
  | { kind: "object"; properties: Record<string, Type> };

export type varTypes =
  | "number"
  | "string"
  | "boolean"
  | "null"
  | "undefined"
  | "bigint"
  | "symbol"
  | "void"
  | "any"
  | "function"
  | "array"
  | "object";

export function compareTypes(a: Type, b: Type): boolean {
  if (typeof a === "string" && typeof b === "string") {
    return a === b;
  }
  if (typeof a === "object" && typeof b === "object") {
    if (a.kind === "function" && b.kind === "function") {
      if (a.paramTypes.length !== b.paramTypes.length) return false;
      for (let i = 0; i < a.paramTypes.length; i++) {
        if (!compareTypes(a.paramTypes[i]!, b.paramTypes[i]!)) return false;
      }
      return compareTypes(a.returnType, b.returnType);
    }
    if (a.kind === "array" && b.kind === "array") {
      return compareTypes(a.elementType, b.elementType);
    }
    if (a.kind === "object" && b.kind === "object") {
      const aKeys = Object.keys(a.properties);
      const bKeys = Object.keys(b.properties);
      if (aKeys.length !== bKeys.length) return false;
      for (let key of aKeys) {
        if (
          !(key in b.properties) ||
          !compareTypes(a.properties[key]!, b.properties[key]!)
        ) {
          return false;
        }
      }
      return true;
    }
  }
  return false;
}

export function typeToString(t: Type): string {
  if (typeof t === "string") return t;
  if (t.kind === "function") {
    const params = t.paramTypes.map(typeToString).join(", ");
    return `(${params}) => ${typeToString(t.returnType)}`;
  }
  if (t.kind === "array") {
    return `Array<${typeToString(t.elementType)}>`;
  }
  if (t.kind === "object") {
    const props = Object.entries(t.properties)
      .map(([key, type]) => `${key}: ${typeToString(type)}`)
      .join(", ");
    return `{ ${props} }`;
  }
  return "unknown";
}

// ---------------------------------------------------
// 2. Type Environment - Handles scoped type tracking for variables
// ---------------------------------------------------
export class TypeEnvironment {
  private types: Record<string, Type> = {};
  public parent?: TypeEnvironment;

  constructor(parent?: TypeEnvironment) {
    this.parent = parent;
  }

  public getType(name: string): Type {
    if (name in this.types) {
      return this.types[name]!;
    }
    if (this.parent) {
      return this.parent.getType(name);
    }
    throw new Error(`Undefined variable (type): ${name}`);
  }

  public setType(name: string, type: Type): void {
    this.types[name] = type;
  }

  public createChild(): TypeEnvironment {
    return new TypeEnvironment(this);
  }
}

// ---------------------------------------------------
// 3. Execution Context - Runtime variable scope and built-ins
// ---------------------------------------------------
export class ExecutionContext {
  private variables: Record<string, any> = {};
  public parent?: ExecutionContext;
  public breakSignal = false;
  public continueSignal = false;

  constructor(parent?: ExecutionContext) {
    this.parent = parent;
    this.injectBuiltIns();
  }

  private injectBuiltIns() {
    this.setVariable("print", (...args: any[]) => console.log(...args));
    this.setVariable("typeOf", (val: any) =>
      Array.isArray(val) ? "array" : typeof val
    );
    this.setVariable("now", () => Date.now());
    this.setVariable("random", () => Math.random());
    this.setVariable("isNaN", (x: any) => isNaN(x));
    this.setVariable("abs", (x: number) => Math.abs(x));
    this.setVariable("sqrt", (x: number) => Math.sqrt(x));
    this.setVariable("floor", (x: number) => Math.floor(x));
    this.setVariable("ceil", (x: number) => Math.ceil(x));
    this.setVariable("fetch", async (url: string) => {
      const res = await fetch(url);
      return await res.text();
    });
  }

  public getVariable(name: string): any {
    if (name in this.variables) return this.variables[name];
    if (this.parent) return this.parent.getVariable(name);
    throw new Error(`Undefined variable: ${name}`);
  }

  public setVariable(name: string, value: any): void {
    this.variables[name] = value;
  }

  public createChildContext(): ExecutionContext {
    return new ExecutionContext(this);
  }
}

// ---------------------------------------------------
// 4. Abstract Syntax Tree - Node base class
// ---------------------------------------------------
export abstract class ASTNode {
  abstract execute(context: ExecutionContext): any;
  abstract inferType(env: TypeEnvironment): Type;
}

// ---------------------------------------------------
// Customizable AST Node - makes users can create their own nodes
// ---------------------------------------------------

export const CustomASTNode = (
  exec: (context: ExecutionContext) => any,
  type:
    | "number"
    | "string"
    | "boolean"
    | "null"
    | "undefined"
    | "bigint"
    | "symbol"
    | "void"
    | "any"
    | { kind: "function"; paramTypes: Type[]; returnType: Type }
    | { kind: "array"; elementType: Type }
    | { kind: "object"; properties: Record<string, Type> }
    | ((env: TypeEnvironment) => Type)
) => {
  return new (class extends ASTNode {
    constructor() {
      super();
    }

    execute(context: ExecutionContext) {
      return exec(context);
    }

    inferType(env: TypeEnvironment): Type {
      if (typeof type === "function") {
        return type(env);
      }
      if (typeof type === "string") {
        return type;
      }

      return type as Type;
    }
  })();
};

function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, any>();
  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// ---------------------------------------------------
// Variable Declaration - let/const support with type checking
// ---------------------------------------------------

export class VariableDeclarationNode extends ASTNode {
  constructor(
    public varType: varTypes,
    public name: string,
    public expression: ASTNode
  ) {
    super();
  }

  execute(context: ExecutionContext): any {
    let val: any;
    if (this.varType === "function") {
      if (
        this.expression instanceof FunctionLiteralNode ||
        this.expression instanceof ArrowFunctionNode
      ) {
        val = this.expression.toFunction(context);
      } else {
        throw new Error(`Variable '${this.name}' expected a function literal`);
      }
    } else {
      val = this.expression.execute(context);

      const typeChecks: Record<string, [(v: any) => boolean, string]> = {
        number: [(v) => typeof v === "number", "number"],
        string: [(v) => typeof v === "string", "string"],
        boolean: [(v) => typeof v === "boolean", "boolean"],
        undefined: [(v) => v === undefined, "undefined"],
        null: [(v) => v === null, "null"],
        bigint: [(v) => typeof v === "bigint", "bigint"],
        array: [(v) => Array.isArray(v), "array"],
        object: [
          (v) => v !== null && typeof v === "object" && !Array.isArray(v),
          "object",
        ],
      };
      const validator = typeChecks[this.varType];
      if (!validator) {
        throw new Error(`Unsupported variable type: ${this.varType}`);
      }
      const [checkFn, expected] = validator;
      if (!checkFn(val)) {
        const got =
          val === null ? "null" : Array.isArray(val) ? "array" : typeof val;
        throw new Error(
          `Variable '${this.name}' expected ${expected}, got ${got}`
        );
      }
    }
    context.setVariable(this.name, val);
    return val;
  }

  inferType(env: TypeEnvironment): Type {
    const actualType = this.expression.inferType(env);
    const typeMap: Record<string, Type> = {
      n_: "number",
      s_: "string",
      b_: "boolean",
      u_: "undefined",
      l_: "null",
      x_: "bigint",
      a_: actualType,
      o_: actualType,
      f_: actualType,
    };
    const expected = typeMap[this.varType];
    if (!expected) {
      throw new Error(`Unsupported variable type: ${this.varType}`);
    }
    if (!compareTypes(actualType, expected)) {
      throw new Error(
        `Type mismatch in declaration of '${
          this.name
        }': expected ${typeToString(expected)}, got ${typeToString(actualType)}`
      );
    }
    env.setType(this.name, actualType);
    return actualType;
  }
}

// ---------------------------------------------------
// Variable Assignment - reassigns existing variables
// ---------------------------------------------------
export class AssignmentNode extends ASTNode {
  constructor(public name: string, public expression: ASTNode) {
    super();
  }

  execute(context: ExecutionContext): any {
    const value = this.expression.execute(context);
    context.setVariable(this.name, value);
    return value;
  }

  inferType(env: TypeEnvironment): Type {
    const currentType = env.getType(this.name);
    const newType = this.expression.inferType(env);
    if (!compareTypes(currentType, newType)) {
      throw new Error(
        `Type mismatch in assignment to '${
          this.name
        }': expected ${JSON.stringify(currentType)}, got ${JSON.stringify(
          newType
        )}`
      );
    }
    return currentType;
  }
}

// ---------------------------------------------------
// Signals - return, break, continue, error
// ---------------------------------------------------

export class ReturnSignal {
  constructor(public value: any) {}
}
export class BreakSignal {}
export class ContinueSignal {}

export class ReturnNode extends ASTNode {
  constructor(public expression: ASTNode) {
    super();
  }
  execute(ctx: ExecutionContext) {
    const v = this.expression.execute(ctx);
    throw new ReturnSignal(v);
  }
  inferType(env: TypeEnvironment): Type {
    return this.expression.inferType(env);
  }
}

export class BreakNode extends ASTNode {
  execute(ctx: ExecutionContext) {
    throw new BreakSignal();
  }
  inferType(env: TypeEnvironment): Type {
    return "void";
  }
}

export class ContinueNode extends ASTNode {
  execute(ctx: ExecutionContext) {
    throw new ContinueSignal();
  }
  inferType(env: TypeEnvironment): Type {
    return "void";
  }
}

export class ErrorNode extends ASTNode {
  constructor(public message: ASTNode) {
    super();
  }

  execute(context: ExecutionContext): any {
    const msg = this.message.execute(context);
    throw new Error(String(msg));
  }

  inferType(env: TypeEnvironment): Type {
    return "void";
  }
}

// ---------------------------------------------------
// FunctionLiteralNode - Named or anonymous block-style functions
// ---------------------------------------------------
export class FunctionLiteralNode extends ASTNode {
  constructor(
    public name: string | null,
    public params: string[],
    public body: ASTNode[],
    public declaredParamTypes?: Type[],
    public declaredReturnType?: Type,
    public pure: boolean = false
  ) {
    super();
  }

  execute(context: ExecutionContext): any {
    throw new Error(
      "Function literal must be transformed into a callable via toFunction()."
    );
  }

  toFunction(outerContext: ExecutionContext): (...args: any[]) => any {
    let fn = (...args: any[]) => {
      const localCtx = outerContext.createChildContext();
      if (args.length !== this.params.length)
        throw new Error("Argument count mismatch.");
      this.params.forEach((p, i) => localCtx.setVariable(p, args[i]));
      try {
        for (const stmt of this.body) {
          stmt.execute(localCtx);
        }
        return undefined;
      } catch (e) {
        if (e instanceof ReturnSignal) {
          return e.value;
        }
        throw e;
      }
    };
    if (this.pure) fn = memoize(fn);
    return fn;
  }

  inferType(env: TypeEnvironment): Type {
    const localEnv = env.createChild();
    const paramTypes: Type[] = [];
    (this.declaredParamTypes || []).forEach((pt, i) => {
      localEnv.setType(this.params[i]!, pt);
      paramTypes.push(pt);
    });
    let bodyType: Type = "void";
    for (const stmt of this.body) {
      bodyType = stmt.inferType(localEnv);
    }
    if (
      this.declaredReturnType &&
      !compareTypes(bodyType, this.declaredReturnType)
    ) {
      throw new Error(
        `Return type mismatch: expected ${typeToString(
          this.declaredReturnType
        )}, got ${typeToString(bodyType)}`
      );
    }
    if (this.name) {
      env.setType(this.name, {
        kind: "function",
        paramTypes,
        returnType: this.declaredReturnType || bodyType,
      });
    }
    return {
      kind: "function",
      paramTypes,
      returnType: this.declaredReturnType || bodyType,
    };
  }
}

// ---------------------------------------------------
// ArrowFunctionNode - Lambda expressions with closures
// ---------------------------------------------------
export class ArrowFunctionNode extends ASTNode {
  constructor(
    public paramNames: string[],
    public body: ASTNode // single-expression function
  ) {
    super();
  }

  execute(context: ExecutionContext): any {
    throw new Error(
      "Arrow function must be transformed into a callable via toFunction()."
    );
  }

  toFunction(context: ExecutionContext): any {
    return (...args: any[]) => {
      const childCtx = context.createChildContext();
      this.paramNames.forEach((name, i) => {
        childCtx.setVariable(name, args[i]);
      });
      return this.body.execute(childCtx);
    };
  }

  inferType(env: TypeEnvironment): Type {
    const childEnv = env.createChild();
    const paramTypes: Type[] = [];
    this.paramNames.forEach((name) => {
      childEnv.setType(name, "any");
      paramTypes.push("any");
    });
    const returnType = this.body.inferType(childEnv);
    return {
      kind: "function",
      paramTypes,
      returnType,
    };
  }
}

// ---------------------------------------------------
// FunctionCallNode - Invoking functions (user-defined or built-in)
// ---------------------------------------------------
export class FunctionCallNode extends ASTNode {
  constructor(public functionName: string, public args: ASTNode[]) {
    super();
  }

  execute(context: ExecutionContext): any {
    const value = context.getVariable(this.functionName);
    if (typeof value !== "function") {
      throw new Error(`'${this.functionName}' is not callable`);
    }

    const evaluated = this.args.map((arg) =>
      arg instanceof FunctionLiteralNode
        ? arg.toFunction(context)
        : arg.execute(context)
    );
    return value(...evaluated);
  }

  inferType(env: TypeEnvironment): Type {
    const fnType = env.getType(this.functionName);
    if (typeof fnType === "object" && fnType.kind === "function") {
      if (fnType.paramTypes.length !== this.args.length) {
        throw new Error("Argument count mismatch in call");
      }
      this.args.forEach((arg, i) => {
        const at = arg.inferType(env);
        if (!compareTypes(at, fnType.paramTypes[i]!)) {
          throw new Error(
            `Arg type mismatch at position ${i}: expected ${typeToString(
              fnType.paramTypes[i]!
            )} got ${typeToString(at)}`
          );
        }
      });
      return fnType.returnType;
    }
    throw new Error(`'${this.functionName}' is not a function`);
  }
}

// ---------------------------------------------------
// LiteralNode - Numbers, strings, booleans, etc.
// ---------------------------------------------------
export class LiteralNode extends ASTNode {
  constructor(public value: any) {
    super();
  }

  execute(context: ExecutionContext): any {
    return this.value;
  }

  inferType(env: TypeEnvironment): Type {
    const v = this.value;
    if (v === null) return "null";
    const t = typeof v;
    if (t === "number") return "number";
    if (t === "string") return "string";
    if (t === "boolean") return "boolean";
    if (t === "undefined") return "undefined";
    if (t === "bigint") return "bigint";
    if (t === "symbol") return "symbol";
    return "any";
  }
}

// ---------------------------------------------------
// VariableReferenceNode - References to variable names
// ---------------------------------------------------
export class VariableReferenceNode extends ASTNode {
  constructor(public name: string) {
    super();
  }

  execute(context: ExecutionContext): any {
    return context.getVariable(this.name);
  }

  inferType(env: TypeEnvironment): Type {
    return env.getType(this.name);
  }
}

// ---------------------------------------------------
// OperatorNode - Arithmetic, logic, comparison, concat
// ---------------------------------------------------
export class OperatorNode extends ASTNode {
  constructor(public operator: string, public operands: [ASTNode, ASTNode]) {
    super();
  }

  execute(context: ExecutionContext): any {
    const leftVal = this.operands[0].execute(context);
    const rightVal = this.operands[1].execute(context);
    switch (this.operator) {
      case "+": // numeric addition
        return leftVal + rightVal;
      case "-": // subtraction
        return leftVal - rightVal;
      case "*": // multiplication
        return leftVal * rightVal;
      case "/": // division
        return leftVal / rightVal;
      case "//": // integer division (floor)
        return Math.floor(leftVal / rightVal);
      case "^": // exponentiation
        return leftVal ** rightVal;
      case "==": // equal
        return leftVal === rightVal;
      case "!==": // not equal
        return leftVal !== rightVal;
      case "<": // less than
        return leftVal < rightVal;
      case "<=": // less than or equal
        return leftVal <= rightVal;
      case ">": // greater than
        return leftVal > rightVal;
      case ">=": // greater than or equal
        return leftVal >= rightVal;
      case "&&": // logical AND
        return Boolean(leftVal) && Boolean(rightVal);
      case "||": // logical OR
        return Boolean(leftVal) || Boolean(rightVal);
      case "concat": // array concatenation
        return Array.isArray(leftVal) && Array.isArray(rightVal)
          ? leftVal.concat(rightVal)
          : (() => {
              throw new Error(`Operator 'concat' requires two arrays.`);
            })();
      case "><":
        return String(leftVal) + String(rightVal);
      default:
        throw new Error(`Unknown operator: ${this.operator}`);
    }
  }

  inferType(env: TypeEnvironment): Type {
    const leftType = this.operands[0].inferType(env);
    const rightType = this.operands[1].inferType(env);
    switch (this.operator) {
      case "o_plus":
      case "o_minus":
      case "o_mul":
      case "o_div":
      case "o_idiv":
      case "o_pow":
        if (leftType !== "number" || rightType !== "number") {
          throw new Error(`${this.operator} requires numeric operands.`);
        }
        return "number";
      case "o_eq":
      case "o_neq":
      case "o_lt":
      case "o_lte":
      case "o_gt":
      case "o_gte":
        if (!compareTypes(leftType, rightType)) {
          throw new Error(`${this.operator} requires operands of same type.`);
        }
        return "boolean";
      case "o_and":
      case "o_or":
        if (leftType !== "boolean" || rightType !== "boolean") {
          throw new Error(`${this.operator} requires boolean operands.`);
        }
        return "boolean";
      case "o_concat":
        if (typeof leftType === "object" && typeof rightType === "object") {
          if (leftType.kind !== "array" || rightType.kind !== "array") {
            throw new Error(
              `Operator 'concat' requires both operands to be arrays.`
            );
          }

          const elemType = compareTypes(
            leftType.elementType,
            rightType.elementType
          )
            ? leftType.elementType
            : "any";
          return { kind: "array", elementType: elemType };
        } else {
          throw new Error(
            `Operator 'concat' requires both operands to be arrays.`
          );
        }

      default:
        throw new Error(`Unknown operator in type inference: ${this.operator}`);
    }
  }
}

// ---------------------------------------------------
// MethodCallNode - Built-in methods on string, array, number
// ---------------------------------------------------
export class MethodCallNode extends ASTNode {
  constructor(
    public target: ASTNode,
    public methodName: string,
    public args: ASTNode[]
  ) {
    super();
  }

  execute(context: ExecutionContext): any {
    let result = this.target.execute(context);
    if (result == null)
      throw new Error(`Cannot call method '${this.methodName}' on ${result}`);

    const evaluatedArgs = this.args.map((arg) => arg.execute(context));
    const targetType = typeof result;

    if (targetType === "string") {
      switch (this.methodName) {
        case "length":
          return result.length;
        case "toUpperCase":
          return result.toUpperCase();
        case "toLowerCase":
          return result.toLowerCase();
        case "slice":
          return result.slice(...evaluatedArgs);
        case "parseInt":
          return parseInt(result);
        case "parseFloat":
          return parseFloat(result);
        default:
          throw new Error(`Unknown string method: ${this.methodName}`);
      }
    } else if (Array.isArray(result)) {
      switch (this.methodName) {
        case "length":
          return result.length;
        case "push":
          return result.push(...evaluatedArgs);
        case "pop":
          return result.pop();
        case "map":
          return result.map(evaluatedArgs[0]);
        case "filter":
          return result.filter(evaluatedArgs[0]);
        default:
          throw new Error(`Unknown array method: ${this.methodName}`);
      }
    } else if (targetType === "number") {
      switch (this.methodName) {
        case "toString":
          return result.toString();
        default:
          throw new Error(`Unknown number method: ${this.methodName}`);
      }
    }

    const fn = result[this.methodName];
    if (typeof fn === "function") return fn.apply(result, evaluatedArgs);
    throw new Error(`'${this.methodName}' is not a method on ${result}`);
  }

  inferType(env: TypeEnvironment): Type {
    const targetType = this.target.inferType(env);

    if (targetType === "string") {
      switch (this.methodName) {
        case "length":
          return "number";
        case "toUpperCase":
        case "toLowerCase":
        case "slice":
          return "string";
        case "parseInt":
        case "parseFloat":
          return "number";
      }
    }

    if (typeof targetType === "object" && targetType.kind === "array") {
      switch (this.methodName) {
        case "length":
          return "number";
        case "push":
          return "number";
        case "pop":
          return targetType.elementType;
        case "map":
        case "filter":
          return { kind: "array", elementType: "any" };
      }
    }

    return "any";
  }
}

// ---------------------------------------------------
// ParameterNode - Represents a named function parameter
// ---------------------------------------------------
export class ParameterNode extends ASTNode {
  constructor(public name: string) {
    super();
  }

  execute(context: ExecutionContext): any {
    return this.name;
  }

  inferType(env: TypeEnvironment): Type {
    return env.getType(this.name);
  }
}

// ---------------------------------------------------
// ArrayLiteralNode - Literal arrays and type deduction
// ---------------------------------------------------
export class ArrayLiteralNode extends ASTNode {
  constructor(public elements: ASTNode[]) {
    super();
  }

  execute(context: ExecutionContext): any {
    return this.elements.map((el) => el.execute(context));
  }

  inferType(env: TypeEnvironment): Type {
    if (this.elements.length === 0)
      return { kind: "array", elementType: "any" };
    let elementType = this.elements[0]!.inferType(env);
    for (let i = 1; i < this.elements.length; i++) {
      const currentType = this.elements[i]!.inferType(env);
      if (!compareTypes(elementType, currentType)) {
        elementType = "any";
        break;
      }
    }
    return { kind: "array", elementType };
  }
}

// ---------------------------------------------------
// IndexAssignmentNode - Assign value to array[index]
// ---------------------------------------------------
export class IndexAssignmentNode extends ASTNode {
  constructor(
    public target: ASTNode, // e.g., VariableReferenceNode for "arr"
    public index: ASTNode, // e.g., LiteralNode(0)
    public value: ASTNode // e.g., LiteralNode(42)
  ) {
    super();
  }

  execute(context: ExecutionContext): any {
    const arr = this.target.execute(context);
    const i = this.index.execute(context);
    const val = this.value.execute(context);

    if (!Array.isArray(arr)) throw new Error("Target is not an array");
    if (typeof i !== "number") throw new Error("Index must be a number");

    arr[i] = val;
    return val;
  }

  inferType(env: TypeEnvironment): Type {
    const arrType = this.target.inferType(env);
    const indexType = this.index.inferType(env);
    const valType = this.value.inferType(env);

    if (indexType !== "number") throw new Error("Index must be a number");

    if (typeof arrType === "object" && arrType.kind === "array") {
      if (!compareTypes(arrType.elementType, valType)) {
        throw new Error(
          "Assigned value type does not match array element type"
        );
      }
      return valType;
    }

    throw new Error("Target must be an array");
  }
}

// ---------------------------------------------------
// ObjectLiteralNode - Inline object definition
// ---------------------------------------------------
export class ObjectLiteralNode extends ASTNode {
  constructor(public properties: Record<string, ASTNode>) {
    super();
  }

  execute(context: ExecutionContext): any {
    const result: any = {};
    for (const key in this.properties) {
      result[key] = this.properties[key]!.execute(context);
    }
    return result;
  }

  inferType(env: TypeEnvironment): Type {
    const propTypes: Record<string, Type> = {};
    for (const key in this.properties) {
      propTypes[key] = this.properties[key]!.inferType(env);
    }
    return { kind: "object", properties: propTypes };
  }
}

// ---------------------------------------------------
// PropertyAccessNode - Access object[key] or object.prop
// ---------------------------------------------------
export class PropertyAccessNode extends ASTNode {
  constructor(
    public object: ASTNode,
    public property: string | ASTNode // static or dynamic
  ) {
    super();
  }

  execute(context: ExecutionContext): any {
    const obj = this.object.execute(context);
    if (obj == null)
      throw new Error("Cannot access property of null/undefined");

    const key =
      typeof this.property === "string"
        ? this.property
        : this.property.execute(context);

    return obj[key];
  }

  inferType(env: TypeEnvironment): Type {
    const objType = this.object.inferType(env);
    if (typeof objType === "object" && objType.kind === "object") {
      if (typeof this.property === "string") {
        return objType.properties[this.property] ?? "any";
      }
    }
    return "any";
  }
}

// ---------------------------------------------------
// BlockNode - Executes multiple statements in a child scope
// ---------------------------------------------------
export class BlockNode extends ASTNode {
  constructor(public statements: ASTNode[]) {
    super();
  }

  execute(context: ExecutionContext): any {
    const childContext = context.createChildContext();
    let returnValue: any;
    for (const stmt of this.statements) {
      returnValue = stmt.execute(childContext);
    }
    return returnValue;
  }

  inferType(env: TypeEnvironment): Type {
    const childEnv = env.createChild();
    let type: Type = "void";
    for (const stmt of this.statements) {
      type = stmt.inferType(childEnv);
    }
    return type;
  }
}

// ---------------------------------------------------
// IfNode - Conditional branching
// ---------------------------------------------------
export class IfNode extends ASTNode {
  constructor(
    public condition: ASTNode,
    public thenBranch: ASTNode[],
    public elseBranch?: ASTNode[]
  ) {
    super();
  }

  execute(context: ExecutionContext): any {
    const cond = this.condition.execute(context);
    if (typeof cond !== "boolean") throw new Error("Condition must be boolean");
    const branch = cond ? this.thenBranch : this.elseBranch ?? [];
    let result;
    const childCtx = context.createChildContext();
    for (const stmt of branch) {
      result = stmt.execute(childCtx);
    }
    return result;
  }

  inferType(env: TypeEnvironment): Type {
    const condType = this.condition.inferType(env);
    if (condType !== "boolean") throw new Error("Condition must be boolean");
    const thenEnv = env.createChild();
    const elseEnv = env.createChild();
    this.thenBranch.forEach((stmt) => stmt.inferType(thenEnv));
    this.elseBranch?.forEach((stmt) => stmt.inferType(elseEnv));
    return "void";
  }
}

// ---------------------------------------------------
// SignalNode - For sending signals, e.g. break, continue
// ---------------------------------------------------
export class SignalNode extends ASTNode {
  constructor(public signal: "break" | "continue") {
    super();
  }

  execute(context: ExecutionContext): any {
    if (this.signal === "break") {
      context.breakSignal = true;
    } else if (this.signal === "continue") {
      context.continueSignal = true;
    }
  }

  inferType(env: TypeEnvironment): Type {
    return "void";
  }
}

// ---------------------------------------------------
// WhileNode - Standard while loop
// ---------------------------------------------------
export class WhileNode extends ASTNode {
  constructor(public condition: ASTNode, public body: ASTNode[]) {
    super();
  }

  execute(context: ExecutionContext): any {
    let result;
    while (true) {
      const cond = this.condition.execute(context);
      if (typeof cond !== "boolean")
        throw new Error("Condition must be boolean");
      if (!cond) break;
      const loopCtx = context.createChildContext();
      try {
        for (const stmt of this.body) {
          result = stmt.execute(context);
        }
      } catch (e) {
        if (e instanceof ContinueSignal) {
          continue;
        }
        if (e instanceof BreakSignal) {
          break;
        }
        throw e;
      }
      if (loopCtx.breakSignal) return result;
    }
    return result;
  }

  inferType(env: TypeEnvironment): Type {
    const condType = this.condition.inferType(env);
    if (condType !== "boolean") throw new Error("Condition must be boolean");
    const bodyEnv = env.createChild();
    this.body.forEach((stmt) => stmt.inferType(bodyEnv));
    return "void";
  }
}

// ---------------------------------------------------
// ForNode - C-style for loop
// ---------------------------------------------------
export class ForNode extends ASTNode {
  constructor(
    public init: ASTNode,
    public condition: ASTNode,
    public update: ASTNode,
    public body: ASTNode[]
  ) {
    super();
  }

  execute(context: ExecutionContext): any {
    this.init.execute(context);
    let result;
    while (true) {
      const cond = this.condition.execute(context);
      if (typeof cond !== "boolean")
        throw new Error("Condition must be boolean");
      if (!cond) break;
      const loopCtx = context.createChildContext();
      try {
        for (const stmt of this.body) {
          result = stmt.execute(loopCtx);
        }
        this.update.execute(context);
      } catch (e) {
        if (e instanceof ContinueSignal) {
          this.update.execute(context);
          continue;
        }
        if (e instanceof BreakSignal) {
          break;
        }
        throw e;
      }
    }
    return result;
  }

  inferType(env: TypeEnvironment): Type {
    this.init.inferType(env);
    const condType = this.condition.inferType(env);
    if (condType !== "boolean") throw new Error("Condition must be boolean");
    this.update.inferType(env);
    const bodyEnv = env.createChild();
    this.body.forEach((stmt) => stmt.inferType(bodyEnv));
    return "void";
  }
}

// ---------------------------------------------------
// SwitchNode - Switch/case control structure
// ---------------------------------------------------
export class SwitchNode extends ASTNode {
  constructor(
    public expression: ASTNode,
    public cases: { match: ASTNode; body: ASTNode[] }[],
    public defaultCase?: ASTNode[]
  ) {
    super();
  }

  execute(context: ExecutionContext): any {
    const value = this.expression.execute(context);
    let result;
    for (const caseBlock of this.cases) {
      if (value === caseBlock.match.execute(context)) {
        const childCtx = context.createChildContext();
        for (const stmt of caseBlock.body) {
          result = stmt.execute(childCtx);
        }
        return result;
      }
    }
    if (this.defaultCase) {
      const childCtx = context.createChildContext();
      for (const stmt of this.defaultCase) {
        result = stmt.execute(childCtx);
      }
    }
    return result;
  }

  inferType(env: TypeEnvironment): Type {
    const exprType = this.expression.inferType(env);
    for (const { match, body } of this.cases) {
      const matchType = match.inferType(env);
      if (!compareTypes(exprType, matchType)) {
        throw new Error("Switch case type mismatch with expression");
      }
      const caseEnv = env.createChild();
      body.forEach((stmt) => stmt.inferType(caseEnv));
    }
    if (this.defaultCase) {
      const defaultEnv = env.createChild();
      this.defaultCase.forEach((stmt) => stmt.inferType(defaultEnv));
    }
    return "void";
  }
}

// ---------------------------------------------------
// DoWhileNode - Do...while loop (guaranteed first execution)
// ---------------------------------------------------
export class DoWhileNode extends ASTNode {
  constructor(public body: ASTNode[], public condition: ASTNode) {
    super();
  }

  execute(context: ExecutionContext): any {
    let result;
    do {
      const childCtx = context.createChildContext();
      try {
        for (const stmt of this.body) {
          result = stmt.execute(childCtx);
        }
      } catch (e) {
        if (e instanceof ContinueSignal) {
          continue;
        }
        if (e instanceof BreakSignal) {
          break;
        }

        throw e;
      }
      if (childCtx.breakSignal) break;
    } while (this.condition.execute(context));
    return result;
  }

  inferType(env: TypeEnvironment): Type {
    const childEnv = env.createChild();
    for (const stmt of this.body) stmt.inferType(childEnv);
    const condType = this.condition.inferType(env);
    if (condType !== "boolean") throw new Error("Condition must be boolean");
    return "void";
  }
}

// ---------------------------------------------------
// ForEachNode - Iterates through an array
// ---------------------------------------------------
export class ForEachNode extends ASTNode {
  constructor(
    public itemName: string,
    public iterable: ASTNode,
    public body: ASTNode[]
  ) {
    super();
  }

  execute(context: ExecutionContext): any {
    const array = this.iterable.execute(context);
    if (!Array.isArray(array)) throw new Error("Target is not iterable");
    let result;
    for (const item of array) {
      const loopCtx = context.createChildContext();
      loopCtx.setVariable(this.itemName, item);
      try {
        for (const stmt of this.body) {
          result = stmt.execute(loopCtx);
        }
      } catch (e) {
        if (e instanceof ContinueSignal) {
          continue;
        }
        if (e instanceof BreakSignal) {
          break;
        }

        throw e;
      }
    }
    return result;
  }

  inferType(env: TypeEnvironment): Type {
    const iterableType = this.iterable.inferType(env);
    if (typeof iterableType !== "object" || iterableType.kind !== "array") {
      throw new Error("Target of ForEach must be an array");
    }
    const childEnv = env.createChild();
    childEnv.setType(this.itemName, iterableType.elementType);
    for (const stmt of this.body) stmt.inferType(childEnv);
    return "void";
  }
}

// ---------------------------------------------------
// TryCatchNode - Error handling block
// ---------------------------------------------------
export class TryCatchNode extends ASTNode {
  constructor(
    public tryBlock: ASTNode[],
    public catchVar: string,
    public catchBlock: ASTNode[]
  ) {
    super();
  }

  execute(context: ExecutionContext): any {
    const tryCtx = context.createChildContext();
    try {
      let result;
      for (const stmt of this.tryBlock) {
        result = stmt.execute(tryCtx);
      }
      return result;
    } catch (err) {
      if (
        err instanceof ReturnSignal ||
        err instanceof BreakSignal ||
        err instanceof ContinueSignal
      ) {
        throw err;
      }

      const catchCtx = context.createChildContext();
      catchCtx.setVariable(this.catchVar, err);
      let catchResult;
      for (const stmt of this.catchBlock) {
        catchResult = stmt.execute(catchCtx);
      }
      return catchResult;
    }
  }

  inferType(env: TypeEnvironment): Type {
    const tryEnv = env.createChild();
    const catchEnv = env.createChild();
    this.tryBlock.forEach((stmt) => stmt.inferType(tryEnv));
    catchEnv.setType(this.catchVar, "any");
    this.catchBlock.forEach((stmt) => stmt.inferType(catchEnv));
    return "void";
  }
}

// ---------------------------------------------------
// Interpreter - Executes an array of AST nodes
// ---------------------------------------------------
export class Interpreter {
  public nodes: ASTNode[];

  constructor(Nodes: any[]) {
    this.nodes = Nodes;
  }

  public execute(): ExecutionContext {
    const context = new ExecutionContext();
    this.nodes.forEach((node) => {
      node.execute(context);
    });
    return context;
  }
}

export const App = (
  nodes: ASTNode[],
  contextFn?: (context: ExecutionContext) => any
) => {
  const context = new Interpreter(nodes).execute();
  if (contextFn) return contextFn(context);
};
