import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import { cleanTitle } from "./youtube";
import { NOTIONS } from "./notions";
import { NO_AUTHOR } from "./posters";

// L'IA est un assistant éditorial : elle propose, l'équipe M-Éditer valide.
// Rien de ce qu'elle produit n'est publié sans validation humaine.

const ReadingSchema = z.object({
  philosopher: z.string().describe("Nom complet d'un philosophe réel, tel qu'il est usuellement cité."),
  book: z.string().describe("Titre exact, en français, d'un livre réellement écrit par ce philosophe."),
  part: z
    .string()
    .nullable()
    .describe("La partie du livre qui traite précisément de la question (livre, chapitre, section, avec son numéro et son titre usuel), ou null si tu n'en es pas certain."),
  description: z.string().describe("Deux phrases : ce que le livre apporte pour approfondir la question."),
});

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
    .describe("Une seule question de solution, sur le modèle « Quelle attitude adopter (individuelle et collective) pour qu'à la fois nous puissions, d'une part, … pour gagner en … sans courir le risque de …, et d'autre part, garantir … sans courir le risque cette fois de … ? »"),
  readings: z
    .array(ReadingSchema)
    .describe("Trois philosophes à lire pour approfondir la question, chacun avec un livre ; liste vide si tu n'es pas certain des titres."),
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
- La question de solution (champ solutionQuestion) suit toujours ce modèle : « Quelle attitude adopter (individuelle et collective) pour qu'à la fois nous puissions, d'une part, [ce que permet la première branche] pour gagner en [ce qu'elle apporte] sans courir le risque de [son danger], et d'autre part, garantir [ce que défend la seconde branche] sans courir le risque cette fois de [son danger] ? » Elle demande comment garder ce que chaque branche a de juste sans courir le risque qu'elle comporte. Garde les mots du modèle (« Quelle attitude adopter (individuelle et collective) pour qu'à la fois nous puissions, d'une part », « pour gagner en », « sans courir le risque de », « et d'autre part, garantir », « sans courir le risque cette fois de ») et adapte seulement le contenu.
Exemple pour la question « Confier nos jugements aux machines, est-ce corriger nos erreurs ou renoncer à notre sagesse ? » :
problem : « Laisser la machine juger à notre place, c'est manquer de sagesse, d'autonomie et de responsabilité. Mais refuser d'utiliser les machines, c'est se condamner à être anachronique. »
solutionQuestion : « Quelle attitude adopter (individuelle et collective) pour qu'à la fois nous puissions, d'une part, utiliser les machines pour gagner en précision et en efficacité sans courir le risque de l'irresponsabilité, et d'autre part, garantir notre autonomie de jugement sans courir le risque cette fois d'être passéistes en renonçant au progrès technique ? »`;

const READING_RULES = `Pour approfondir la question, propose trois philosophes et, pour chacun, un livre qui éclaire directement la question, présenté en deux phrases accessibles (ce que l'on y trouve, et en quoi cela aide à surmonter le problème).
- Ne cite que des philosophes réels et des livres dont tu es certain qu'ils existent et qu'ils sont bien de cet auteur, avec leur titre français usuel. Préfère les œuvres classiques et reconnues.
- N'invente jamais de titre, de chapitre, de citation, d'édition ni de date. En cas de doute sur un titre, choisis un autre livre ; si tu ne peux pas en proposer trois avec certitude, propose-en moins.
- Ne cite pas l'intervenant de la vidéo : ces lectures viennent compléter son approche.
- Les trois philosophes représentent si possible des positions différentes sur la question.
- Pour chaque livre, indique la partie qui traite précisément de la question (champ part) : le livre, le chapitre ou la section, avec sa numérotation et son titre usuels, par exemple « Livre I, chapitre 8 : « De l'état civil » » pour Du contrat social. N'indique une partie que si tu es certain qu'elle existe sous ce numéro et ce titre et qu'elle traite de la question ; sinon mets null. Une partie inventée est une faute.`;

const SYSTEM = `Tu aides l'équipe éditoriale des Éditions M-Éditer, maison d'édition philosophique, à préparer la fiche quotidienne de l'application « Mon café philo ».
On te donne le titre et la description d'une courte vidéo (Short) où un philosophe ou un universitaire réel s'exprime.

Propose :
- un titre de fiche, qui n'est PAS une question, sous la forme « Interrogeons-nous sur… » suivi de l'objet de la réflexion : par exemple « Interrogeons-nous sur le rôle de la technique dans nos décisions », « Interrogeons-nous sur la place de la violence dans l'éthique » ;
- le thème : les trois notions du programme officiel de philosophie de terminale (voie générale) les plus utiles pour travailler la question, choisies uniquement dans cette liste : ${NOTIONS.join(", ")} ;
- une question philosophique courte, claire et stimulante, qui ne soit ni factuelle ni orientée vers sa propre réponse. Elle est TOUJOURS formulée comme une alternative entre deux positions défendables, avec « ou » : par exemple « La technique nous libère-t-elle ou nous asservit-elle ? », « Parler, est-ce transmettre des mots ou partager une présence ? ». Les deux branches doivent être aussi sérieuses l'une que l'autre ;
- l'approche de la question par l'auteur : en deux phrases rigoureuses et accessibles, la manière dont l'intervenant aborde et répond à cette question, telle que la description permet de l'établir (champ synthesis). Ce n'est pas une citation : c'est une reformulation fidèle ;
- le problème à surmonter et la question de solution, adaptés à cette question ;
- trois philosophes à lire pour approfondir la question (champ readings).

${PROBLEM_RULES}

${READING_RULES}

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
export async function proposeProblem(
  input: { question: string; synthesis?: string | null; problem?: string | null },
  client = defaultClient(),
): Promise<ProblemProposalT | null> {
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
        content: `Question : ${input.question}${input.synthesis ? `\n\nApproche de l'auteur (pour contexte, ne pas la recopier) : ${input.synthesis}` : ""}${input.problem ? `\n\nProblème déjà validé (la question de solution doit y répondre ; tu peux le reprendre tel quel dans le champ problem) : ${input.problem}` : ""}`,
      },
    ],
  });
  if (response.stop_reason === "refusal") return null;
  return response.parsed_output ?? null;
}

const ReadingsProposal = z.object({ readings: Proposal.shape.readings });

// Pour une fiche déjà rédigée : propose seulement les trois philosophes à lire.
export async function proposeReadings(input: { question: string; synthesis?: string | null }, client = defaultClient()) {
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 3000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(ReadingsProposal) },
    system: `Tu aides l'équipe éditoriale des Éditions M-Éditer à terminer la page « Je suis » de l'application « Mon café philo ». Écris en français.\n\n${READING_RULES}`,
    messages: [
      {
        role: "user",
        content: `Question : ${input.question}${input.synthesis ? `\n\nApproche de l'auteur de la vidéo (pour contexte) : ${input.synthesis}` : ""}`,
      },
    ],
  });
  if (response.stop_reason === "refusal") return null;
  return response.parsed_output?.readings ?? null;
}

const FrameChoice = z.object({
  image: z.number().int().describe("Numéro de l'image retenue (1 pour la première), ou 0 si aucune image ne montre le visage de l'auteur."),
});

// Image d'attente du Short : l'IA choisit, parmi quelques images de la vidéo, celle qui présente l'auteur
// sous son meilleur jour. Elle ne modifie pas les images.
export async function chooseFlatteringFrame(frames: Buffer[], client = defaultClient()): Promise<number | null> {
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 500,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(FrameChoice) },
    system: `Tu aides les Éditions M-Éditer à choisir l'image d'attente d'une courte vidéo où un auteur s'exprime. Choisis l'image qui le présente sous son meilleur jour : visage net et bien visible, regard ouvert, expression naturelle et bienveillante, bouche fermée ou au repos, pas d'image floue ni de grimace en pleine parole, le moins de texte possible devant le visage. Seule une image où l'on voit l'auteur lui-même convient : si aucune ne le montre (images d'illustration, sport, couverture de livre, carton de titre), réponds 0.`,
    messages: [
      {
        role: "user",
        content: [
          ...frames.flatMap((f, i) => [
            { type: "text" as const, text: `Image ${i + 1} :` },
            { type: "image" as const, source: { type: "base64" as const, media_type: "image/jpeg" as const, data: f.toString("base64") } },
          ]),
          { type: "text" as const, text: "Quelle image retenir ?" },
        ],
      },
    ],
  });
  if (response.stop_reason === "refusal") return null;
  const n = response.parsed_output?.image;
  if (n === 0) return NO_AUTHOR;
  return n && n >= 1 && n <= frames.length ? n - 1 : null;
}

const PartsProposal = z.object({
  parts: z
    .array(z.string().nullable())
    .describe("Pour chaque livre, dans l'ordre donné : la partie qui traite précisément de la question, ou null si tu n'en es pas certain."),
});

// Pour des lectures déjà choisies : précise seulement la partie de chaque livre qui traite de la question.
export async function proposeReadingParts(
  input: { question: string; readings: { philosopher: string; book: string }[] },
  client = defaultClient(),
): Promise<(string | null)[] | null> {
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 2000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(PartsProposal) },
    system: `Tu aides l'équipe éditoriale des Éditions M-Éditer à préciser les lectures conseillées de l'application « Mon café philo ». Écris en français.\n\n${READING_RULES}`,
    messages: [
      {
        role: "user",
        content: `Question : ${input.question}\n\nLivres :\n${input.readings.map((r, i) => `${i + 1}. ${r.philosopher}, ${r.book}`).join("\n")}`,
      },
    ],
  });
  if (response.stop_reason === "refusal") return null;
  const parts = response.parsed_output?.parts;
  return parts && parts.length === input.readings.length ? parts : null;
}

const CoverChoice = z.object({
  image: z.number().int().describe("Numéro de la couverture retenue (1 pour la première), ou 0 si aucune ne convient."),
});

// Couverture d'un livre conseillé : l'IA retient, parmi plusieurs éditions réelles, la plus digne de l'œuvre.
export async function chooseBookCover(covers: Buffer[], r: { philosopher: string; book: string }, client = defaultClient()): Promise<number | null> {
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 500,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(CoverChoice) },
    system: `Tu aides les Éditions M-Éditer à illustrer une lecture conseillée par la couverture d'une édition réelle du livre. Choisis la couverture qui convient le mieux à un public adulte qui veut lire l'œuvre : une édition française sérieuse et soignée (collection de poche ou de philosophie), dont la couverture montre bien le titre et l'auteur.
Écarte : une adaptation (manga, bande dessinée, version jeunesse, résumé, guide de lecture), une édition en langue étrangère, une couverture d'un autre livre ou d'un autre auteur, un exemplaire abîmé ou couvert d'étiquettes et de tampons de bibliothèque, une image floue ou illisible. Si aucune ne convient, réponds 0.`,
    messages: [
      {
        role: "user",
        content: [
          { type: "text" as const, text: `Livre : ${r.book}, de ${r.philosopher}.` },
          ...covers.flatMap((c, i) => [
            { type: "text" as const, text: `Couverture ${i + 1} :` },
            { type: "image" as const, source: { type: "base64" as const, media_type: "image/jpeg" as const, data: c.toString("base64") } },
          ]),
          { type: "text" as const, text: "Quelle couverture retenir ?" },
        ],
      },
    ],
  });
  if (response.stop_reason === "refusal") return null;
  const n = response.parsed_output?.image;
  return n && n >= 1 && n <= covers.length ? n - 1 : null;
}

const BooksChoice = z.object({
  books: z.array(z.number().int()).describe("Numéros des livres retenus (1 pour le premier), du plus utile au moins utile, trois au plus."),
});

// Bibliographie de l'auteur : l'IA choisit seulement, parmi ses livres publiés, ceux qui éclairent le mieux la question.
export async function chooseAuthorBooks(question: string, titles: string[], client = defaultClient()): Promise<number[] | null> {
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 500,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(BooksChoice) },
    system: "Tu aides les Éditions M-Éditer à présenter, sous une question philosophique, les livres de l'auteur qui permettent d'approfondir sa pensée sur cette question. Choisis au plus trois livres dans la liste, d'après leurs titres, en commençant par le plus proche de la question.",
    messages: [{ role: "user", content: `Question : ${question}\n\nLivres de l'auteur :\n${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}` }],
  });
  if (response.stop_reason === "refusal") return null;
  return response.parsed_output?.books.map((n) => n - 1) ?? null;
}

// ---------- articles de presse ----------

const ArticleSchema = z.object({
  url: z.string().describe("Adresse exacte de l'article, telle qu'elle figure dans les résultats de recherche."),
  title: z.string().describe("Titre exact de l'article."),
  source: z.string().describe("Nom du média ou de l'institution qui publie l'article."),
  author: z.string().nullable().describe("Auteur ou autrice de l'article, ou null s'il n'est pas indiqué."),
  date: z.string().nullable().describe("Date de publication (AAAA-MM-JJ), ou null si elle n'est pas indiquée."),
  side: z.string().describe("La branche de l'alternative de la question que l'article défend, en quelques mots."),
  description: z
    .string()
    .describe("Deux phrases rédigées par toi, 70 mots au plus, sans citer l'article : ce qu'il soutient, puis ce qu'il ne voit pas du problème en choisissant cette seule branche."),
  readInFull: z.boolean().describe("Vrai seulement si tu as lu l'article en entier avec web_fetch et qu'il est librement accessible, sans abonnement."),
});
const ArticlesChoice = z.object({
  articles: z.array(ArticleSchema).describe("Deux articles, un pour chaque branche de l'alternative ; une liste vide si tu n'en trouves pas deux qui conviennent."),
});
export type ArticleProposal = z.infer<typeof ArticleSchema>;
export interface ArticleSearch {
  articles: ArticleProposal[];
  // Adresses réellement renvoyées par la recherche : un article proposé doit en faire partie.
  seenUrls: string[];
  // Adresses réellement lues : un article retenu doit avoir été lu en entier.
  readUrls: string[];
  // Consommation de la recherche, pour estimer son coût.
  usage?: { input: number; output: number; searches: number; fetches: number };
}

// Relève les adresses trouvées et celles réellement lues, où qu'elles figurent dans la réponse (la recherche peut
// passer par l'exécution de code). Une lecture compte sous l'adresse demandée comme sous l'adresse renvoyée.
function collectUrls(content: unknown, seenUrls: string[], readUrls: string[]) {
  const asked = new Map<string, string>();
  const walk = (o: unknown): void => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== "object") return;
    const b = o as Record<string, unknown>;
    if (b.type === "server_tool_use" && b.name === "web_fetch" && typeof (b.input as { url?: unknown })?.url === "string") asked.set(b.id as string, (b.input as { url: string }).url);
    if (b.type === "web_search_result" && typeof b.url === "string") seenUrls.push(b.url);
    if (b.type === "web_fetch_tool_result") {
      const r = b.content as { type?: string; url?: string } | undefined;
      if (r?.type === "web_fetch_result") {
        if (r.url) readUrls.push(r.url);
        const first = asked.get(b.tool_use_id as string);
        if (first) readUrls.push(first);
      }
    }
    for (const v of Object.values(b)) if (typeof v === "object") walk(v);
  };
  walk(content);
}

// L'IA cherche sur les seuls sites autorisés deux articles qui prennent chacun une branche de l'alternative.
export async function proposeArticles(
  input: { question: string; problem?: string | null },
  domains: string[],
  client = defaultClient(),
): Promise<ArticleSearch | null> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `Question : ${input.question}${input.problem ? `\n\nProblème que pose la question : ${input.problem}` : ""}`,
    },
  ];
  const seenUrls: string[] = [];
  const readUrls: string[] = [];
  const usage = { input: 0, output: 0, searches: 0, fetches: 0 };
  for (let turn = 0; turn < 6; turn++) {
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(ArticlesChoice) },
      tools: [
        { type: "web_search_20260209", name: "web_search", max_uses: 10, allowed_domains: domains },
        { type: "web_fetch_20260209", name: "web_fetch", max_uses: 8, allowed_domains: domains },
      ],
      system: `Tu aides les Éditions M-Éditer à compléter la page « Pour aller plus loin » de l'application « Mon café philo ». La question du jour est une alternative entre deux positions.
Cherche deux articles de presse en ligne, librement accessibles, publiés sur les sites autorisés : le premier penche nettement vers une branche de l'alternative, le second vers l'autre. Un article convient s'il soutient le fond de cette position, même avec d'autres mots, sur un exemple précis ou à propos d'un auteur ; il n'a pas besoin de poser la question telle quelle. Chacun, parce qu'il privilégie une seule branche, se heurte au problème sans le voir : c'est ce qui intéresse le lecteur.
Fais plusieurs recherches courtes, avec des mots-clés différents pour chaque branche. Lis ensuite les candidats les plus prometteurs un par un : si une page ne convient pas, lis-en une autre, jusqu'à avoir un article pour chaque branche. Un article qui défend clairement l'une des deux positions sur un sujet voisin convient mieux qu'aucun article.
Tu certifies chaque article retenu : avant de le proposer, lis-le en entier avec web_fetch. Ne le retiens que s'il est librement accessible en entier, publié par le site lui-même (ni blog, ni tribune promotionnelle, ni page d'accueil, ni liste), et s'il soutient vraiment la branche que tu lui attribues. Le titre, l'auteur et la date sont ceux de la page lue ; ta présentation est fidèle à ce que tu as lu.
Ne propose que des articles trouvés dans les résultats de recherche, avec leur adresse exacte. N'invente aucun titre, aucun auteur, aucune date, aucune adresse. Ne renvoie une liste vide qu'après avoir lu au moins six pages sans en trouver deux qui conviennent.
Écris en français.`,
      messages,
    });
    usage.input += response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0) + (response.usage.cache_creation_input_tokens ?? 0);
    usage.output += response.usage.output_tokens;
    usage.searches += response.usage.server_tool_use?.web_search_requests ?? 0;
    usage.fetches += response.usage.server_tool_use?.web_fetch_requests ?? 0;
    collectUrls(response.content, seenUrls, readUrls);
    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    if (response.stop_reason === "refusal") return null;
    return { articles: response.parsed_output?.articles ?? [], seenUrls, readUrls, usage };
  }
  return null;
}
