# PromptFuzzer Web

PromptFuzzer 的独立 Vue 3 管理端，负责串联：

```text
RECON -> ApplicationSurface -> AttackUnit -> Candidate -> AGENT/DUAL
```

## 本地开发

前置条件：PromptFuzzer 后端运行在 `http://127.0.0.1:9091`。

```bash
npm install
npm run dev
```

前端固定运行在：

```text
http://127.0.0.1:5174
```

Vite 将 `/api` 代理到后端 `9091`。已启用 `strictPort`，端口被占用时会直接报错。

## 构建

```bash
npm run build
```
