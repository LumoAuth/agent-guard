<div align="center">

# LumoAuth Guard contract

**The open specification behind LumoAuth Guard.**<br>
How a personal agent's tool calls are checked outside the model, before the tool runs.

![Contract v1](https://img.shields.io/badge/contract-v1-111111?style=flat-square)
[![License: MIT](https://img.shields.io/badge/license-MIT-111111?style=flat-square)](LICENSE)

[Specification](SPEC.md) · [Catalog](catalog) · [Test vectors](vectors) · [OpenClaw plugin](https://github.com/lumoauth/openclaw) · [Hermes plugin](https://github.com/lumoauth/hermes) · [Documentation](https://docs.lumoauth.dev/agents/personal-agents)

</div>

---

**LumoAuth Guard** is a plugin for personal AI agents such as OpenClaw and Hermes.
It checks every tool call that the agent makes before the tool runs. Each call is allowed, sent to a person for approval, or blocked.
You keep the rules in LumoAuth, not in the conversation, so a prompt injection cannot change them.

This repository holds what every Guard plugin shares: the written contract, the data that the contract uses, and the test cases that show whether a plugin follows it.

> **Looking for the plugin?** Install it from its own repository:
>
> - **OpenClaw:** [lumoauth/openclaw](https://github.com/lumoauth/openclaw), published on npm as `@lumoauth/openclaw`
> - **Hermes Agent:** [lumoauth/hermes](https://github.com/lumoauth/hermes), published on PyPI as `lumoauth-hermes`

## Why the contract is public

You should be able to check what a security tool does before you trust it with your machine.

- **Review every rule.** The specification lists the paths and commands that are always protected, the order of each decision, when a session counts as holding untrusted input, and what an approval request shows.
- **Check a plugin against it.** The test vectors settle every detail. A plugin conforms when it passes all of them, and both official plugins run them in their test suites.
- **See the whole protocol.** The specification describes each request that a plugin sends to LumoAuth: tokens, the capability snapshot, audit receipts, approvals and enrollment.

Publishing the rules does not weaken them. The check runs outside the model, so the rules hold whatever the model knows about them.

## What's inside

| Path | What it is |
|---|---|
| [`SPEC.md`](SPEC.md) | The contract: threat model, classification, hard rules, decision order, approvals, the LumoAuth protocol, setup and enrollment, doctor, and the bindings for each host. |
| [`catalog/capabilities.json`](catalog/capabilities.json) | Every built-in capability, with its label and risk. |
| [`catalog/openclaw.json`](catalog/openclaw.json), [`catalog/hermes.json`](catalog/hermes.json) | The built-in tools of each host: capability, risk, flags, the arguments that hold paths and commands, and tool rules. |
| [`catalog/mcp-verbs.json`](catalog/mcp-verbs.json) | How the risk of an MCP tool follows from its name. |
| [`catalog/presets.json`](catalog/presets.json) | The presets Observer, Personal assistant and Builder: what setup ticks at the start. |
| [`vectors/`](vectors) | Conformance cases. A plugin conforms when it passes all of them. `agent-capabilities.json` holds the same matching cases that LumoAuth's server and SDKs pass. |
| [`skills/lumoauth-guard/SKILL.md`](skills/lumoauth-guard/SKILL.md) | The skill that both plugins include. It tells the model what the Guard is and how to behave when a call is blocked or waits for approval. |
| [`scripts/validate.mjs`](scripts/validate.mjs) | Checks the catalog, the presets, the vectors and the skill for consistency. |

The first line of `SPEC.md` names the contract version, currently v1.

## How the plugins use it

Each plugin keeps a copy of the contract, so that it works without this repository.
A sync script makes the copy, and a check fails when the copy differs:

```text
                agent-guard  (this repository)
            SPEC.md · catalog/ · vectors/ · skills/
                   │                         │
       npm run sync-contract     python scripts/sync_contract.py
                   ▼                         ▼
           lumoauth/openclaw           lumoauth/hermes
       contract/catalog/          src/lumoauth_hermes/contract/
       contract/vectors/          src/lumoauth_hermes/skills/
       skills/lumoauth-guard/     tests/contract/vectors/
```

The CI of each plugin checks out this repository next to the plugin and runs that check.
Nothing here is published to a package registry.

## Validate

```sh
node scripts/validate.mjs
```

The script needs Node.js and no packages. It prints `agent-guard contract: OK` when it finds no conflicts between the files.

## Changing the contract

1. Change `SPEC.md` and the catalog or the vectors together. When the text and a vector disagree, the vector wins and the text has a bug.
2. Run `node scripts/validate.mjs`.
3. Check out both plugins next to this repository. Copy the contract into each plugin and run its tests:

   ```sh
   (cd ../openclaw && npm run sync-contract && npm test)
   (cd ../hermes && python scripts/sync_contract.py && python -m pytest)
   ```

A change to the LumoAuth protocol (§7) or to enrollment (§8.2) needs a matching change on the LumoAuth server.
Please open an issue before you start one.

## Reporting a security issue

Please don't report security issues in public issues.
Write to [security@lumoauth.dev](mailto:security@lumoauth.dev) instead.

## License

MIT. See [LICENSE](LICENSE).
