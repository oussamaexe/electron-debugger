## Workflow
- Before making any changes: read the relevant code first, debug to understand the root cause, then write tests to confirm understanding, only then make the fix
- Never jump straight to editing code — understand first, verify with tests, then change

# electron-debugger Code Patterns

This project's patterns are defined in the global constitution at `~/.config/opencode/CONSTITUTION.md`. The rules below are specific to this project, not universal.

## TypeScript & ESM
- Use `import type` for type-only imports: `import type { X } from './x.js'`
- Add `.js` extension to all relative imports (ESM convention)
- Never use `any` — use `unknown` if type is truly unknown, but prefer explicit types
- Never use `null` — use `undefined` or `X | undefined` instead
- Prefer `interface` over `type` for object shapes

## Exports & Functions
- Named exports only — no `export default`
- Use `async function` declarations (not arrow functions for top-level)
- Export types alongside values (no separate types file if avoidable)

## Naming Conventions
- Full words, no abbreviations — `discoverTargets` not `discTgts`, `getConfig` not `getCfg`
- Verb-noun order for functions — `getConfig`, `createMcpServer`, `resolveNodeId`
- Tool factories follow `create<Category>Tools` pattern — `createDomTools`, `createConsoleTools`
- Boolean-returning functions/methods read as yes/no questions — `isConnected`
- No single-letter variable names (exception: loop counters in 3-line scopes)
- Tool name strings use kebab-case — `get-dom-snapshot`, `click-element`

## Style
- No JSDoc comments — code should be self-documenting
- No blank lines between imports
- Single blank line between top-level blocks
- Error handling: throw `new Error()` directly, no try/catch wrappers unless recovery logic exists

## Human Touch
- Solve the problem in front of you — don't add abstractions for hypothetical future needs
- Prefer guard clauses and early returns over deep nesting
- Code should read top-to-bottom like a story, with clear intent at each step
- Error messages are for humans debugging at 2am — be specific: `Failed to connect to target ${targetId}` not `Connection failed`
- Keep types simple — no complex generics, no type-party tricks. If a typescript type needs a paragraph to understand, it's wrong
- Name variables for what they hold, not their type — `targets` not `targetArray`, `config` not `configObject`
- Don't repeat the obvious — `await client.send('Runtime.evaluate', { expression })` doesn't need a comment
- Flat beats nested — minimize indentation depth with early returns
- Be consistent: if one handler uses pattern X, all handlers use pattern X

## SDK Patterns (MCP)
- Tool handlers receive `(client: CdpClient)` — tools are functions, not classes
- Tool shape: `{ name, description, inputSchema, handler }`
- Handler returns `{ content: [{ type: 'text', text: string }] }`

## Testing (Vitest)
- Use `describe`/`it` blocks
- Mock external deps with `vi.mock()`
- Prefer `toEqual` / `toStrictEqual` over snapshot tests
