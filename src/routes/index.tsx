import { createFileRoute } from "@tanstack/react-router";
import { SnakeGame } from "@/components/SnakeGame";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "AWS Snake — Jogo da Cobrinha com tema AWS" },
      { name: "description", content: "Jogo da cobrinha temático AWS. Colete serviços da nuvem e cresça sua arquitetura serverless." },
    ],
  }),
});

function Index() {
  return <SnakeGame />;
}
