import {
  App,
  FunctionCallNode,
  LiteralNode,
  VariableDeclarationNode,
  VariableReferenceNode,
} from "./interpreter";

App([
  new VariableDeclarationNode("number", "a", new LiteralNode(1)),
  new FunctionCallNode("print", [new VariableReferenceNode("a")]),
  new VariableDeclarationNode(
    "function",
    "recover",
    new FunctionCallNode("temporaryRm", [new LiteralNode("a")])
  ),
]);
