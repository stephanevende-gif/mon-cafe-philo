import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import { cleanTitle } from "./youtube";
import { NOTIONS } from "./notions";

// L'IA est un assistant éditorial : elle propose, l'équipe M-Éditer valide.
// Rien de ce qu'elle produit n'est publié sans validation humaine.

const Proposal = z.object({
  title: z
    .string()
    .describe("Titre de la fiche, qui n'est pas une question : « Interrogeons-nous sur le rôle de… », « Interrogeons-nous sur la place de… », etc."),
  notions: z
    .array(z.enum(NOTIONS))
    .describe("Les trois notions du programme officiel de philosophie de terminale les plus utiles pour travailler la question."),
  question: z
    .string()
    .describe("Une question philosophique courte, toujours formulée comme une alternative entre deux positions : « … ou … ? »."),
  synthesis: z
    .string()
    .nullable()
    .describe("Approche de la question par l'auteur : deux phrases fidèles à l'intervention, ou null si la description ne permet pas de savoir ce que dit l'intervenant."),
  author: z
    .string()
    .nullable()
    .describe("Nom de l'intervenant tel qu'il figure dans le titre ou la description, ou null s'il n'y figure pas."),
  missing: z.string().nullable().describe("Ce qui manque pour une fiche fiable, ou null."),
});

export type SheetProposal = z.infer<typeof Proposal>;

const SYSTEM = `Tu aides l'équipe éditoriale des Éditions M-Éditer, maison d'édition philosophique, à préparer la fiche quotidienne de l'application « Mon café philo ».
On te donne le titre et la description d'une courte vidéo (Short) où un philosophe ou un universitaire réel s'exprime.

Propose :
- un titre de fiche, qui n'est PAS une question, sous la forme « Interrogeons-nous sur… » suivi de l'objet de la réflexion : par exemple « Interrogeons-nous sur le rôle de la technique dans nos décisions », « Interrogeons-nous sur la place de la violence dans l'éthique » ;
- le thème : les trois notions du programme officiel de philosophie de terminale (voie générale) les plus utiles pour travailler la question, choisies uniquement dans cette liste : ${NOTIONS.join(", ")} ;
- une question philosophique courte, claire et stimulante, qui ne soit ni factuelle ni orientée vers sa propre réponse. Elle est TOUJOURS formulée comme une alternative entre deux positions défendables, avec « ou » : par exemple « La technique nous libère-t-elle ou nous asservit-elle ? », « Parler, est-ce transmettre des mots ou partager une présence ? ». Les deux branches doivent être aussi sérieuses l'une que l'autre ;
- l'approche de la question par l'auteur : en deux phrases rigoureuses et accessibles, la manière dont l'intervenant aborde et répond à cette question, telle que la description permet de l'établir (champ synthesis). Ce n'est pas une citation : c'est une reformulation fidèle ;

L'approche décrite doit rester fidèle à ce que la description permet d'établir sur la pensée de l'intervenant. N'invente aucun nom d'intervenant, aucune citation, aucun titre, aucun diplôme, aucune référence. Si la description ne dit pas assez clairement ce que soutient l'intervenant, mets synthesis à null et explique ce qui manque dans missing.
Écris en français.`;

// Certains hébergeurs réservent le nom ANTHROPIC_API_KEY (et fixent ANTHROPIC_BASE_URL) pour leur propre usage :
// la clé de l'application peut donc aussi être fournie sous le nom CAFE_PHILO_ANTHROPIC_KEY.
function apiKey(): string | undefined {
  return process.env.CAFE_PHILO_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY || undefined;
}

export function aiEnabled(): boolean {
  return !!apiKey();
}

function defaultClient(): Anthropic {
  return new Anthropic({ apiKey: apiKey(), baseURL: process.env.CAFE_PHILO_ANTHROPIC_KEY ? "https://api.anthropic.com" : undefined });
}

export async function proposeSheet(input: { title: string; description: string }, client = defaultClient()): Promise<SheetProposal | null> {
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
        content: `Titre du Short : ${cleanTitle(input.title)}\n\nDescription :\n${input.description || "(aucune description)"}`,
      },
    ],
  });
  if (response.stop_reason === "refusal") return null;
  return response.parsed_output ?? null;
}
