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
  problem: z
    .string()
    .describe("Le problème à surmonter : en deux phrases, ce que l'on risque en choisissant chacune des deux branches de l'alternative de la question."),
  solutionQuestion: z
    .string()
    .describe("Une seule question de solution, qui commence par « Quelle solution adopter pour à la fois… » et demande comment garder ce que chaque branche a de juste sans courir le risque qu'elle comporte."),
  author: z
    .string()
    .nullable()
    .describe("Nom de l'intervenant tel qu'il figure dans le titre ou la description, ou null s'il n'y figure pas."),
  missing: z.string().nullable().describe("Ce qui manque pour une fiche fiable, ou null."),
});

export type SheetProposal = z.infer<typeof Proposal>;

const PROBLEM_RULES = `Principe des Éditions M-Éditer : on ne philosophe pas vraiment tant que l'on ne pose pas un problème, qu'on ne l'instruit pas et qu'on ne s'y confronte pas pour le surmonter, avec et pour les autres. Les solutions évidentes et les réponses sans analyse sont sources d'erreur, et même de faute. Le problème doit donc être réel : aucune des deux branches ne doit l'emporter d'évidence.
Le problème à surmonter et la question de solution aident le lecteur à rédiger sa propre réponse, après avoir réfléchi seul puis écouté l'auteur. Ils ne donnent jamais la solution : c'est au lecteur de la proposer.
- Le problème (champ problem) explique en deux phrases pourquoi aucune des deux branches de l'alternative ne suffit : ce que l'on risque si l'on choisit la première, ce que l'on risque si l'on choisit la seconde. Il reprend les termes de la question.
- La question de solution (champ solutionQuestion) commence par « Quelle solution adopter pour à la fois… » et demande comment garder ce que chaque branche a de juste sans courir le risque qu'elle comporte.
Exemple pour la question « Confier nos jugements aux machines, est-ce corriger nos erreurs ou renoncer à notre sagesse ? » :
problem : « Laisser la machine juger à notre place, c'est manquer de sagesse, d'autonomie et de responsabilité. Mais refuser d'utiliser les machines, c'est se condamner à être anachronique. »
solutionQuestion : « Quelle solution adopter pour à la fois utiliser les machines au nom du progrès sans courir le risque de l'irresponsabilité, et garantir notre autonomie de jugement sans courir le risque d'être passéiste en renonçant au progrès technique ? »`;

const SYSTEM = `Tu aides l'équipe éditoriale des Éditions M-Éditer, maison d'édition philosophique, à préparer la fiche quotidienne de l'application « Mon café philo ».
On te donne le titre et la description d'une courte vidéo (Short) où un philosophe ou un universitaire réel s'exprime.

Propose :
- un titre de fiche, qui n'est PAS une question, sous la forme « Interrogeons-nous sur… » suivi de l'objet de la réflexion : par exemple « Interrogeons-nous sur le rôle de la technique dans nos décisions », « Interrogeons-nous sur la place de la violence dans l'éthique » ;
- le thème : les trois notions du programme officiel de philosophie de terminale (voie générale) les plus utiles pour travailler la question, choisies uniquement dans cette liste : ${NOTIONS.join(", ")} ;
- une question philosophique courte, claire et stimulante, qui ne soit ni factuelle ni orientée vers sa propre réponse. Elle est TOUJOURS formulée comme une alternative entre deux positions défendables, avec « ou » : par exemple « La technique nous libère-t-elle ou nous asservit-elle ? », « Parler, est-ce transmettre des mots ou partager une présence ? ». Les deux branches doivent être aussi sérieuses l'une que l'autre ;
- l'approche de la question par l'auteur : en deux phrases rigoureuses et accessibles, la manière dont l'intervenant aborde et répond à cette question, telle que la description permet de l'établir (champ synthesis). Ce n'est pas une citation : c'est une reformulation fidèle ;
- le problème à surmonter et la question de solution, adaptés à cette question.

${PROBLEM_RULES}

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

const ProblemProposal = Proposal.pick({ problem: true, solutionQuestion: true });
export type ProblemProposalT = z.infer<typeof ProblemProposal>;

// Pour une fiche déjà rédigée : propose seulement le problème à surmonter et la question de solution.
export async function proposeProblem(input: { question: string; synthesis?: string | null }, client = defaultClient()): Promise<ProblemProposalT | null> {
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 2000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(ProblemProposal) },
    system: `Tu aides l'équipe éditoriale des Éditions M-Éditer à préparer la page « Je suis » de l'application « Mon café philo ». Écris en français.\n\n${PROBLEM_RULES}`,
    messages: [
      {
        role: "user",
        content: `Question : ${input.question}${input.synthesis ? `\n\nApproche de l'auteur (pour contexte, ne pas la recopier) : ${input.synthesis}` : ""}`,
      },
    ],
  });
  if (response.stop_reason === "refusal") return null;
  return response.parsed_output ?? null;
}
