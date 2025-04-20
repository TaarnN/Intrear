# 🧠 Intrear (Beta)

**Such an AST Node Interpreter**

Intrear is an AST‑based interpreter written in TypeScript. It gives you full control over **building**, **type‑checking**, **optimizing** and **executing** custom AST nodes—ideal for learning, scripting, testing new language ideas, or embedding DSLs in your projects.

[🔗 Github Link](https://github.com/TaarnN/Intrear)

## ❗️ Note on Language Creation

While Intrear is described as a “next‑gen way to create your own programming language,” it’s important to clarify that **Intrear is only the interpreter part** of that process.

To build a full interpreted programming language, you typically need:

1. **Tokenizer (or Lexer)**  
   Converts raw source code into a list of meaningful tokens (e.g., keywords, identifiers, symbols).
   ***Example frameworks: Chevrotain, Moo, jison-lex***

2. **Parser**  
   Takes those tokens and builds an **Abstract Syntax Tree (AST)**—a structured representation of the code.
   ***Example frameworks: Chevrotain, Nearley, Peggy, Jison***

3. **Interpreter**  
   Walks the AST to evaluate and execute the code.
   ***Framework: Intrear***

👉 **Intrear covers only step 3: the interpreter.**  
You can build your own tokenizer and parser, then plug the AST into Intrear to execute it.

## v0.1 Changelog

Add return, break, continue and error signals.
They're:

- `ReturnNode`
- `BreakNode`
- `ContinueNode`
- `ErrorNode`

respectively.

## 🔍 What is an AST Node?

An **Abstract Syntax Tree (AST)** is a tree‑shaped representation of source code structure:

- **Each node** represents a language construct: literals, variables, operators, function calls, control‑flow statements, etc.
- By working directly with AST nodes you can **inspect**, **transform**, **optimize**, or **generate** code before running it.
- Intrear’s AST model is **fully extensible**—you can add your own node types (e.g. new operators or built‑ins) without touching the core engine.

## 🔍 What is an Interpreter?

An **interpreter** takes AST nodes and **executes** them directly, without emitting machine code:

1. **Parse** or **construct** an AST
2. **Infer** and **check** types
3. **Walk** the AST to produce side‑effects or return values
4. Optionally **optimize** the tree (constant folding, memoization, JIT stubs)

Unlike a compiler, an interpreter runs your code on the fly—perfect for REPLs, scripting, or embedding a mini‑language in your app.

## ✨ Why use Intrear?

- **Clean, Type‑Safe**  
  Static type inference and checking (`number`, `string`, `boolean`, `array`, `object`, `function`, `null`, `undefined`, `bigint`, `symbol`, `any`) catch errors early.

- **Fully Extensible**  
  Add new AST node classes (e.g. custom control‑flow, operators, built‑ins) with minimal boilerplate.

- **Powerful Features**  
  – First‑class functions & closures  
  – Arrow functions & lambdas  
  – Memoized **pure** functions  
  – Control flow: `if`/`else`, loops, `switch`, `break`/`continue`  
  – Data structures: arrays, objects, property & method calls  
  – Error handling: `try`/`catch`  
  – Built‑ins: `print`, `abs`, `fetch`, `toUpperCase()`, etc.

- **Optimizations**  
  – AST preprocessing & constant folding  
  – Memoization for pure functions  
  – JIT compilation stubs (hot‑path support)

- **Ideal for Learning & Experimentation**  
  – See each stage (AST → inference → execute) in isolation  
  – Rapidly prototype language features or embed DSLs

## 🚀 Getting Started

### 1. Installation

```bash
npm install intrear
```

### 2. Run an Example

```ts
import {
  Interpreter,
  VariableDeclarationNode,
  ArrowFunctionNode,
  FunctionCallNode,
  LiteralNode,
  VariableReferenceNode,
} from "intrear";

const nodes = [
  new VariableDeclarationNode(
    "function",
    "double",
    new ArrowFunctionNode(
      ["x"],
      new FunctionCallNode("print", [new VariableReferenceNode("x")])
    )
  ),
  new FunctionCallNode("double", [new LiteralNode(42)]),
];

new Interpreter(nodes).execute();
```

---

## 📦 Example Usages ( in ASTNode[] body )

### ✅ Declare a Variable

```ts
new VariableDeclarationNode("number", "a", new LiteralNode(5))
```

Equivalents to

```ts
let a: number = 5;
```

### ✅ Define an Arrow Function (Lambda)

```ts
new VariableDeclarationNode(
  "plus",
  "function",
  new ArrowFunctionNode(
    ["a", "b"],
    new OperatorNode("+", [
      new VariableReferenceNode("a"),
      new VariableReferenceNode("b"),
    ])
  )
)
```

Equivalents to

```ts
let plus = (a, b) => a + b;
```

### ✅ Use Control Flow

```ts
new IfNode(
  new OperatorNode("==", [new LiteralNode(3), new LiteralNode(3)]),
  [new FunctionCallNode("print", [new LiteralNode("Equal!")])],
  [new FunctionCallNode("print", [new LiteralNode("Not equal!")])]
)
```

Equivalents to

```ts
if (3 === 3) {
  console.log("Equal!");
} else {
  console.log("Not equal!");
}
```

### ✅ Object Managements

```ts
new VariableDeclarationNode(
  "user",
  "object",
  new ObjectLiteralNode({
    name: new LiteralNode("John Doe"),
  })
),
new FunctionCallNode("print", [
  new PropertyAccessNode(new VariableReferenceNode("user"), "name"),
])
```

Equivalents to

```ts
let user = { name: "John Doe" };
print(user.name);
```

### ✅ Create Your Own AST Node

For running codes that is still currently unavailable in Intrear

```ts
CustomASTNode((context: ExecutionContext) => {
  setTimeout(() => {
    console.log("Hello");
  }, 1000);
}, "void")
```

Equivalents to

```ts
setTimeout(() => {
  console.log("Hello");
}, 1000);
```

---

## 📌 Notes

- Every node is an instance of `ASTNode` and must implement `execute()` and `inferType()`.
- You can build your program by composing nodes and feeding them into the `Interpreter`.

---

## 🛠️ Contributing

You're welcome to contribute new nodes, improve error handling, or build a parser!  
See [`ROADMAP.md`](./intrear?activeTab=code) for ideas.

---

## 📄 License

MIT License.
