# Implementation Plan: mcp-frete-tributario

## Overview

Implement a TypeScript MCP server that exposes four tools for Brazilian freight tax calculation under Reforma Tributária (LC 214/2025). The server uses stdio transport, loads static JSON data at startup, and integrates with BrasilAPI for CNPJ resolution. Implementation follows a layered architecture: bootstrap → tools → services, with property-based tests using `fast-check` and unit tests using `vitest`.

---

## Tasks

- [x] 1. Set up project structure, tooling, and core types
  - Initialize `package.json` with dependencies: `@modelcontextprotocol/sdk`, `zod`, `fast-check`, `vitest`, `typescript`, `@types/node`
  - Create `tsconfig.json` with `strict: true`, `moduleResolution: bundler` (or `node16`), `outDir: dist`, `target: ES2022`
  - Create `vitest.config.ts` with TypeScript support
  - Create directory structure: `src/tools/`, `src/services/`, `src/data/`, `src/__tests__/tools/`, `src/__tests__/server/`, `src/__tests__/fixtures/`
  - Define shared TypeScript interfaces in `src/types.ts`: `CronogramaEntry`, `Empresa`, `CargaTributaria`, `BrasilApiCnpjResponse`, `BrasilApiError`
  - Define and export `UF_VALIDAS` constant (Set of 27 UF siglas) and `halfUp` rounding function in `src/utils.ts`
  - _Requirements: 5.2, 6.1, 6.2_

- [x] 2. Create static data files
  - [x] 2.1 Create `src/data/cronograma-reforma.json` with exactly 8 entries (2026–2033) containing `ano`, `icms`, `iss`, `pis`, `cofins`, `ibs`, `cbs` fields with reference values from the design document
    - _Requirements: 2.2_

  - [x] 2.2 Create `src/data/empresas.json` with at least 5 companies from distinct UFs, each with `razaoSocial`, `cnpj` (14 numeric digits), `uf`, and `valorUltimoFrete` fields
    - _Requirements: 4.2_

  - [x] 2.3 Create test fixtures in `src/__tests__/fixtures/`: `cronograma-test.json` (valid subset), `empresas-test.json` (≥5 companies), `empresas-empty.json` (empty array)
    - _Requirements: 4.2, 4.6_

- [x] 3. Implement `calcular_carga_tributaria_frete` tool
  - [x] 3.1 Implement `src/tools/calcularCargaTributaria.ts`
    - Export a pure handler function `calcularCargaTributaria(params, cronogramaMap)` that validates `ufOrigem`/`ufDestino` against `UF_VALIDAS`, looks up the cronograma entry by `ano`, applies optional NCM differentiated rate (falls back to default if not found), computes all `CargaTributaria` fields using `halfUp`, and returns the result object or `{ isError: true, content }` on validation failure
    - Define the zod input schema (exported separately for use in `src/index.ts`)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x]* 3.2 Write property test for `calcularCargaTributaria` — Property 1: arithmetic consistency
    - **Property 1: Consistência aritmética da carga tributária**
    - **Validates: Requirements 1.1, 1.2, 1.7**
    - File: `src/__tests__/tools/calcularCargaTributaria.property.test.ts`
    - Use `fc.float({ min: 0.01, max: 1_000_000 })`, `fc.constantFrom(...UF_VALIDAS)` × 2, `fc.integer({ min: 2026, max: 2033 })`, `numRuns: 100`

  - [x]* 3.3 Write property test for `calcularCargaTributaria` — Property 2: unknown NCM does not alter result
    - **Property 2: NCM desconhecido não altera resultado**
    - **Validates: Requirements 1.3**
    - File: `src/__tests__/tools/calcularCargaTributaria.property.test.ts`
    - Use same generators as Property 1 plus `fc.string()` for an NCM not in the differentiated table

  - [x]* 3.4 Write property test for `calcularCargaTributaria` — Property 3: rejects non-positive valorFrete
    - **Property 3: Rejeição de valorFrete inválido**
    - **Validates: Requirements 1.4**
    - File: `src/__tests__/tools/calcularCargaTributaria.property.test.ts`
    - Use `fc.oneof(fc.constant(0), fc.float({ max: -Number.EPSILON }))`

  - [x]* 3.5 Write property test for `calcularCargaTributaria` — Property 4: rejects ano out of range
    - **Property 4: Rejeição de ano fora do intervalo**
    - **Validates: Requirements 1.5**
    - File: `src/__tests__/tools/calcularCargaTributaria.property.test.ts`
    - Use `fc.integer().filter(n => n < 2026 || n > 2033)`

  - [x]* 3.6 Write unit tests for `calcularCargaTributaria`
    - Concrete example: `valorFrete = 1000.00`, `ufOrigem = "SP"`, `ufDestino = "RJ"`, `ano = 2026` — verify all 8 output fields
    - Concrete example: NCM with existing differentiated rate applies it correctly
    - Concrete example: invalid UF `"XX"` returns `isError: true` with message `"UF inválida: XX"`
    - File: `src/__tests__/tools/calcularCargaTributaria.unit.test.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.6_

- [x] 4. Checkpoint — ensure all tests pass for task 3
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement `consultar_cronograma_transicao` tool
  - [x] 5.1 Implement `src/tools/consultarCronograma.ts`
    - Export a pure handler function `consultarCronograma(params, cronogramaMap)` that looks up the `CronogramaEntry` by `ano` (O(1) via Map), computes `totalNovoRegime = halfUp(ibs + cbs)` and `totalAntigoRegime = halfUp(icms + iss + pis + cofins)`, and returns all 8 fields or `{ isError: true, content }` for invalid `ano`
    - Export the zod input schema
    - _Requirements: 2.1, 2.3, 2.4, 2.5_

  - [x]* 5.2 Write property test for `consultarCronograma` — Property 10: schedule totals
    - **Property 10: Totais do cronograma**
    - **Validates: Requirements 2.3**
    - File: `src/__tests__/tools/consultarCronograma.property.test.ts`
    - Use `fc.integer({ min: 2026, max: 2033 })`, `numRuns: 100`

  - [x]* 5.3 Write property test for `consultarCronograma` — Property 4: rejects ano out of range
    - **Property 4: Rejeição de ano fora do intervalo (consultar_cronograma_transicao)**
    - **Validates: Requirements 2.4**
    - File: `src/__tests__/tools/consultarCronograma.property.test.ts`
    - Use `fc.integer().filter(n => n < 2026 || n > 2033)`

  - [x]* 5.4 Write unit tests for `consultarCronograma`
    - Verify all 6 percentage fields for each of the 8 years using fixture data
    - Verify error for `ano = 2025` and `ano = 2034`
    - File: `src/__tests__/tools/consultarCronograma.unit.test.ts`
    - _Requirements: 2.1, 2.4_

- [x] 6. Implement `src/services/brasilApiService.ts`
  - [x] 6.1 Implement `brasilApiService.ts`
    - Export `class BrasilApiError` with `cnpj: string` and `motivo: string` fields
    - Implement `fetchCnpj(cnpj: string, timeoutMs = 5000): Promise<BrasilApiCnpjResponse>` using `AbortController` + `signal` for timeout; throw `BrasilApiError` on HTTP ≥ 400 or `AbortError`
    - _Requirements: 3.1, 3.4_

- [x] 7. Implement `simular_impacto_rota` tool
  - [x] 7.1 Implement `src/tools/simularImpactoRota.ts`
    - Export handler function `simularImpactoRota(params, cronogramaMap, fetchCnpjFn)` — inject `fetchCnpjFn` for testability
    - Validate `valorFrete > 0`; strip non-numeric chars and validate 14-digit CNPJ format; return `isError` immediately on failure without calling BrasilAPI
    - Call `Promise.all([fetchCnpjFn(cnpjOrigem), fetchCnpjFn(cnpjDestino)])` concurrently; catch `BrasilApiError` and return formatted error
    - Determine `anoCorrente = new Date().getFullYear()`; validate 2026–2033 range
    - Delegate tax calculation to `calcularCargaTributaria` handler
    - Return full response with `ufOrigem`, `ufDestino`, `razaoSocialOrigem`, `razaoSocialDestino`, `anoCorrente`, and all `CargaTributaria` fields
    - Export the zod input schema
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x]* 7.2 Write property test for `simularImpactoRota` — Property 5: CNPJ resolution and UF mapping
    - **Property 5: Resolução de CNPJ e mapeamento de UF**
    - **Validates: Requirements 3.2, 3.3**
    - File: `src/__tests__/tools/simularImpactoRota.property.test.ts`
    - Mock `fetchCnpjFn`; use `fc.constantFrom(...UF_VALIDAS)` × 2 + `fc.string()` for `razao_social`

  - [x]* 7.3 Write property test for `simularImpactoRota` — Property 6: rejects invalid CNPJ format
    - **Property 6: Rejeição de CNPJ com formato inválido**
    - **Validates: Requirements 3.5**
    - File: `src/__tests__/tools/simularImpactoRota.property.test.ts`
    - Use `fc.string().filter(s => s.replace(/\D/g, '').length !== 14)`; assert BrasilAPI mock is never called

  - [x]* 7.4 Write property test for `simularImpactoRota` — Property 3: rejects non-positive valorFrete
    - **Property 3: Rejeição de valorFrete inválido (simular_impacto_rota)**
    - **Validates: Requirements 3.6**
    - File: `src/__tests__/tools/simularImpactoRota.property.test.ts`
    - Use `fc.oneof(fc.constant(0), fc.float({ max: -Number.EPSILON }))`; assert BrasilAPI mock is never called

  - [x]* 7.5 Write property test for `simularImpactoRota` — Property 8: BrasilAPI failure tolerance
    - **Property 8: Tolerância a falhas de BrasilAPI**
    - **Validates: Requirements 3.4**
    - File: `src/__tests__/tools/simularImpactoRota.property.test.ts`
    - Mock `fetchCnpjFn` to throw `BrasilApiError` with `fc.integer({ min: 400, max: 599 })` HTTP codes + timeout simulation

  - [x]* 7.6 Write unit tests for `simularImpactoRota`
    - Success: two mocked CNPJs returning valid data, verify all output fields
    - Error: HTTP 404 for origin CNPJ
    - Error: simulated timeout for destination CNPJ
    - File: `src/__tests__/tools/simularImpactoRota.unit.test.ts`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8. Implement `listar_empresas_cadastradas` tool
  - [x] 8.1 Implement `src/tools/listarEmpresas.ts`
    - Export handler function `listarEmpresas(empresas: Empresa[])` that returns `{ empresas, totalEmpresas: empresas.length }`, or `{ isError: true, content }` if `empresas` is null/undefined (runtime unavailability)
    - Export the zod input schema (empty object schema)
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 4.6_

  - [x]* 8.2 Write property test for `listarEmpresas` — Property 7: listing invariant
    - **Property 7: Invariante da listagem de empresas**
    - **Validates: Requirements 4.1, 4.3, 4.6**
    - File: `src/__tests__/tools/listarEmpresas.property.test.ts`
    - Use `fc.array(fc.record({ razaoSocial: fc.string({ minLength: 1 }), cnpj: fc.stringMatching(/^\d{14}$/), uf: fc.constantFrom(...UF_VALIDAS), valorUltimoFrete: fc.float({ min: 0 }) }))`

  - [x]* 8.3 Write unit tests for `listarEmpresas`
    - Returns all companies from `empresas-test.json` fixture
    - Returns `totalEmpresas: 0` for empty array without error
    - Returns `isError: true` when runtime data is unavailable
    - File: `src/__tests__/tools/listarEmpresas.unit.test.ts`
    - _Requirements: 4.1, 4.3, 4.4, 4.6_

- [x] 9. Implement bootstrap — `src/index.ts`
  - [x] 9.1 Implement `src/index.ts`
    - Read and parse `cronograma-reforma.json` and `empresas.json` at startup; validate structure (all required fields present); on failure write to stderr and call `process.exit(1)`
    - Build `Map<number, CronogramaEntry>` from cronograma array for O(1) lookup
    - Instantiate `McpServer({ name: "mcp-frete-tributario", version: "1.0.0" })`
    - Register the four tools via `server.tool(name, description, zodSchema, handler)`, wrapping each handler in `try/catch` to return `{ isError: true, content: [...] }` on unexpected exceptions
    - Connect to `StdioServerTransport` and call `server.connect(transport)`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.2, 6.3, 6.4, 6.5_

  - [x]* 9.2 Write property test for bootstrap error handling — Property 9: handler exception resilience
    - **Property 9: Resiliência a exceções em handlers**
    - **Validates: Requirements 6.3, 5.5**
    - File: `src/__tests__/server/bootstrap.unit.test.ts`
    - Mock tool handlers to throw `fc.string()` as error message; assert server returns `isError: true` without process termination

  - [x]* 9.3 Write unit (smoke) tests for server bootstrap
    - Server starts without error given valid JSON files
    - Server exits with code 1 and stderr message when `cronograma-reforma.json` is absent
    - Server exits with code 1 and stderr message when `empresas.json` is absent
    - Server registers exactly 4 tools with correct names
    - File: `src/__tests__/server/bootstrap.unit.test.ts`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 10. Final checkpoint — ensure all tests pass and project compiles
  - Run `npx tsc --noEmit` — must complete with zero errors
  - Run `vitest --run` — all tests must pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The design uses TypeScript with `strict: true`; all types must be explicit — no implicit `any`
- Tool handlers should be pure functions (or dependency-injected) to make property testing straightforward without starting the full MCP server
- `halfUp` rounding: `Math.round(value * 100) / 100` — JavaScript's `Math.round` applies half-up for positive values, satisfying requirement 1.7
- BrasilAPI integration in `simularImpactoRota` must use `Promise.all` (requirement 3.7); inject the fetch function for testability
- All error messages must match exactly the strings defined in the requirements — property tests verify this literally
- Static data files (`cronograma-reforma.json`, `empresas.json`) are loaded once at startup and kept in memory; no file I/O during tool calls

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 1, "tasks": ["3.1", "5.1", "6.1", "8.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "3.4", "3.5", "3.6", "5.2", "5.3", "5.4", "8.2", "8.3", "7.1"] },
    { "id": 3, "tasks": ["7.2", "7.3", "7.4", "7.5", "7.6", "9.1"] },
    { "id": 4, "tasks": ["9.2", "9.3"] }
  ]
}
```
