# 📍 Intrear Language Roadmap

This document outlines the current progress and future plans for the Intrear language interpreter.  
Intrear is a statically typed, dynamically executed scripting engine powered by a rich AST architecture and extensible features.

---

## ✅ Stage 1: Solid Core (Completed)
- [x] AST-based node architecture
- [x] Lexical scoping with child contexts
- [x] Type system with inference (`number`, `string`, `function`, etc.)
- [x] Functions and closures (including arrow functions)
- [x] Built-in functions (`print`, `abs`, `sqrt`, `fetch`, etc.)
- [x] Control flow (`if`, `while`, `for`, `switch`, etc.)
- [x] Support for arrays and objects
- [x] Method chaining on built-ins
- [x] Try-catch error handling

---

## 🧠 Stage 2: Smart Runtime & Interactivity
- [x] Proper return control flow (interrupts outer function execution)
- [x] Scoped `break`/`continue` 
- [x] Unified Result model (`return`, `break`, `continue`, `error`)
- [ ] Type aliases (`type User = {...}`)
- [ ] CLI or web REPL for live testing
- [ ] Pretty error messages with context

---

## 🌐 Stage 3: Async + Modular Ecosystem
- [ ] Async/await syntax for promises
- [ ] Promise object and async task support
- [ ] Import/export system for modules
- [ ] Built-in module registry and cache
- [ ] Standard library modules (math, string, date, utils)

---

## 🚀 Stage 4: Syntax Parser & Language Host
- [ ] Full text parser (PEG.js, Lezer, ANTLR, etc.)
- [ ] Compile .inr source files to AST
- [ ] Command-line runner for Intrear source
- [ ] Source maps and debugging info
- [ ] File I/O and external module loading

---

## 👑 Stage 5: Power User Features
- [ ] Class declarations with methods and constructors
- [ ] Inheritance and polymorphic behavior
- [ ] Pattern matching (`match ... with`)
- [ ] Macros or compile-time AST transforms
- [ ] Memory profiler or object graph tracing
- [ ] Plugin support for interpreter extensions

---

## 💎 Bonus: Experimental & Fun
- [ ] Live-coded animations (a la p5.js)
- [ ] Virtual filesystem & sandboxing
- [ ] Reactive variables / reactivity model
- [ ] Hot-reloading scripts
- [ ] Multiplayer shared REPL session
