import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    dedupe: ["graphql"],
    alias: {
      graphql: resolve("node_modules/graphql/index.js")
    }
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.spec.ts"],
    coverage: {
      provider: "istanbul"
    },
    server: {
      deps: {
        inline: ["graphql", "@apollo/client", "@graphql-tools/schema", "graphql-tag"]
      }
    },
    deps: {
      optimizer: {
        ssr: {
          include: ["graphql", "@apollo/client", "@graphql-tools/schema", "graphql-tag"]
        }
      }
    }
  }
});
