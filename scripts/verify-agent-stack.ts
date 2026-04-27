import OpenAI from "openai";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { tavily } from "@tavily/core";

const State = Annotation.Root({
  value: Annotation<string>({
    reducer: (_previous, next) => next,
    default: () => ""
  })
});

const graph = new StateGraph(State)
  .addNode("echo", async (state) => ({ value: state.value || "ok" }))
  .addEdge(START, "echo")
  .addEdge("echo", END);

const memoryDb = process.env.ACTIVE_HOLIDAYS_AGENT_MEMORY_DB || ":memory:";
const checkpointer = SqliteSaver.fromConnString(memoryDb);
const app = graph.compile({ checkpointer });
const result = await app.invoke(
  { value: "ok" },
  { configurable: { thread_id: "agent-stack-smoke" } }
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "test-key"
});
const tavilyClient = tavily({
  apiKey: process.env.TAVILY_API_KEY || "tvly-test-key"
});

if (result.value !== "ok") {
  throw new Error("LangGraph SQLite in-memory checkpoint smoke check failed.");
}

if (typeof openai.responses.create !== "function") {
  throw new Error("OpenAI Responses API is not available on the installed SDK.");
}

if (typeof tavilyClient.search !== "function") {
  throw new Error("Tavily search client is not available.");
}

console.log(
  JSON.stringify(
    {
      openaiResponses: "ok",
      langGraph: "ok",
      tavily: "ok",
      memoryDb
    },
    null,
    2
  )
);
