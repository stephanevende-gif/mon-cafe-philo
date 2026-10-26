import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";

// L'IA est un assistant éditorial : elle propose, l'équipe M-Éditer valide.
// Rien de ce qu'elle produit n'est publié sans validation humaine.

const Proposal = z.object({
  theme: z.string().describe("Un seul mot ou une courte expression : liberté, vérité, technique…"),
  question: z.string().describe("Une vraie question philosophique, courte, ouverte, qui ne contient pas sa réponse."),
  synthesis: z
    .string()
    .nullable()
    .describe("Deux phrases fidèles à l'intervention, ou null si la description ne permet pas de savoir ce que dit l'intervenant."),
  missing: z.string().nullable().describe("Ce qui manque pour une fiche fiable, ou null."),
});

export type SheetProposal = z.infer<typeof Proposal>;

const SYSTEM = `Tu aides l'équipe éditoriale des Éditions M-Éditer, maison d'édition philosophique, à préparer la fiche quotidienne de l'application « Mon café philo ».
On te donne le titre et la description d'une courte vidéo (Short) où un philosophe ou un universitaire réel s'exprime.

Propose :
- un thème (un mot ou une courte expression, en minuscules) ;
- une question philosophique courte, claire et stimulante, qui ne soit ni factuelle ni orientée vers sa propre réponse ;
- une synthèse de deux phrases, rigoureuse et accessible, qui introduit une distinction, une difficulté ou un paradoxe sans imposer de doctrine.

La synthèse doit rester fidèle à ce que la description permet d'établir sur la pensée de l'intervenant. N'invente aucune citation, aucun titre, aucun diplôme, aucune référence. Si la description ne dit pas assez clairement ce que soutient l'intervenant, mets synthesis à null et explique ce qui manque dans missing.
Écris en français.`;

export function aiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function proposeSheet(input: { title: string; description: string }, client = new Anthropic()): Promise<SheetProposal | null> {
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(Proposal) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Titre du Short : ${input.title}\n\nDescription :\n${input.description || "(aucune description)"}`,
      },
    ],
  });
  if (response.stop_reason === "refusal") return null;
  return response.parsed_output ?? null;
}
