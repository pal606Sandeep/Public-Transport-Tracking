import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../..");
const BACKEND = path.join(ROOT, "backend");
const WORKFLOW = path.join(ROOT, ".github/workflows/backend-ci.yml");

describe("P1-56 — Docker + CI/CD", () => {
  it("Dockerfile exists and is multi-stage", () => {
    const dockerfile = path.join(BACKEND, "Dockerfile");
    expect(fs.existsSync(dockerfile)).toBe(true);
    const content = fs.readFileSync(dockerfile, "utf8");
    expect(content).toMatch(/FROM .* AS build/);
    expect(content).toMatch(/FROM .* AS runtime/);
    expect(content).toMatch(/WORKDIR \/app/);
    expect(content).toMatch(/USER app/);
    expect(content).toMatch(/EXPOSE 4000/);
    expect(content).toMatch(/CMD \["node", "dist\/index.js"\]/);
  });

  it("Dockerfile installs dev deps, builds, then prunes", () => {
    const content = fs.readFileSync(path.join(BACKEND, "Dockerfile"), "utf8");
    expect(content).toMatch(/npm ci --include=dev/);
    expect(content).toMatch(/npm run build/);
    expect(content).toMatch(/npm prune --omit=dev/);
  });

  it("Dockerfile copies migrations + scripts", () => {
    const content = fs.readFileSync(path.join(BACKEND, "Dockerfile"), "utf8");
    expect(content).toMatch(/COPY migrations/);
    expect(content).toMatch(/COPY scripts/);
    expect(content).toMatch(/COPY migrate-mongo-config\.js/);
  });

  it(".dockerignore excludes tests + node_modules", () => {
    const ignore = path.join(BACKEND, ".dockerignore");
    expect(fs.existsSync(ignore)).toBe(true);
    const content = fs.readFileSync(ignore, "utf8");
    expect(content).toMatch(/node_modules/);
    expect(content).toMatch(/^tests$/m);
    expect(content).toMatch(/^\.env$/m);
  });

  it("docker-compose.yml defines api + worker + mongo + redis services", () => {
    const compose = path.join(BACKEND, "docker-compose.yml");
    expect(fs.existsSync(compose)).toBe(true);
    const content = fs.readFileSync(compose, "utf8");
    expect(content).toMatch(/^  api:/m);
    expect(content).toMatch(/^  worker:/m);
    expect(content).toMatch(/^  mongo:/m);
    expect(content).toMatch(/^  redis:/m);
    expect(content).toMatch(/command: \["node", "dist\/index\.js"\]/);
    expect(content).toMatch(/command: \["node", "dist\/worker\.js"\]/);
  });

  it("docker-compose.yml uses host network + replSet", () => {
    const content = fs.readFileSync(path.join(BACKEND, "docker-compose.yml"), "utf8");
    expect(content).toMatch(/network_mode: host/);
    expect(content).toMatch(/--replSet rs0/);
  });

  it("GitHub Actions workflow covers test + build + migrate", () => {
    expect(fs.existsSync(WORKFLOW)).toBe(true);
    const content = fs.readFileSync(WORKFLOW, "utf8");
    expect(content).toMatch(/jobs:/);
    expect(content).toMatch(/test:/);
    expect(content).toMatch(/build:/);
    expect(content).toMatch(/migrate:/);
    expect(content).toMatch(/npm ci/);
    expect(content).toMatch(/npx tsc --noEmit/);
    expect(content).toMatch(/npm test/);
    expect(content).toMatch(/docker\/build-push-action/);
    expect(content).toMatch(/migrate-mongo up/);
  });

  it("GitHub Actions workflow uses Node 20 + pinned actions", () => {
    const content = fs.readFileSync(WORKFLOW, "utf8");
    expect(content).toMatch(/node-version: 20/);
    expect(content).toMatch(/actions\/checkout@v4/);
    expect(content).toMatch(/actions\/setup-node@v4/);
  });

  it("backend package.json has required scripts", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(BACKEND, "package.json"), "utf8"));
    expect(pkg.scripts.build).toBe("tsc");
    expect(pkg.scripts.test).toBe("vitest run");
    expect(pkg.scripts["migrate:up"]).toBeTruthy();
    expect(pkg.scripts.seed).toBeTruthy();
  });
});