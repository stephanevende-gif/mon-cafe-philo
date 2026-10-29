import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

// Un philosophe à lire pour approfondir la question, avec un de ses livres.
export interface Reading {
  philosopher: string;
  book: string;
  description: string;
  // Partie du livre qui traite précisément de la question (chapitre, section…), seulement si elle est certaine.
  part?: string;
  // Couverture du livre (JPEG en data URL), quand une vraie couverture a été trouvée.
  cover?: string;
}

// Livre de l'auteur de la vidéo aux Éditions M-Éditer, tel que le site le présente.
export interface AuthorBook {
  title: string;
  // Page du livre sur le site des Éditions.
  url: string;
  // Deux premières phrases de la présentation du site, sans réécriture.
  description: string;
  cover?: string;
}

// Article de presse en ligne, librement accessible, qui défend l'une des deux branches de l'alternative.
// Le résumé est rédigé pour l'application : aucun passage de l'article n'est reproduit.
export interface PressArticle {
  title: string;
  source: string;
  url: string;
  author?: string;
  date?: string;
  // La branche de l'alternative que l'article choisit.
  side: string;
  // Deux phrases : ce que l'article soutient, puis ce qu'il laisse de côté du problème.
  description: string;
}

export const roleEnum = pgEnum("role", ["membre", "editeur", "admin"]);
export const tokenPurposeEnum = pgEnum("token_purpose", ["verification", "reinitialisation"]);
export const accessKindEnum = pgEnum("access_kind", ["essai", "paiement", "attribution"]);
export const videoKindEnum = pgEnum("video_kind", ["short", "conference"]);
export const sheetStatusEnum = pgEnum("sheet_status", ["brouillon", "a_verifier", "validee"]);
// « donc » : la version écrite sur la page « Donc ? », après l'écoute de l'auteur.
export const stageEnum = pgEnum("notebook_stage", ["je_pense", "donc", "je_suis"]);
export const runKindEnum = pgEnum("run_kind", ["youtube", "planification"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: roleEnum("role").notNull().default("membre"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  suspensionReason: text("suspension_reason"),
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    // Empreinte SHA-256 du jeton : le jeton lui-même n'est jamais stocké.
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const emailTokens = pgTable("email_tokens", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purpose: tokenPurposeEnum("purpose").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

// Tentatives de connexion et d'envoi, pour limiter les abus.
export const rateEvents = pgTable(
  "rate_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bucket: text("bucket").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("rate_events_bucket_idx").on(t.bucket, t.createdAt)],
);

// Chaque période d'accès : 10 jours d'essai, 355 jours payés, ou attribution manuelle.
export const accessPeriods = pgTable(
  "access_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: accessKindEnum("kind").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    amountCents: integer("amount_cents"),
    reference: text("reference"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("access_user_idx").on(t.userId)],
);

export const speakers = pgTable("speakers", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  qualification: text("qualification").notNull(),
  qualificationSource: text("qualification_source"),
  // Rempli seulement quand un membre de l'équipe a vérifié l'identité et la qualification.
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
  photoUrl: text("photo_url"),
  // Portrait : photo de l'auteur recadrée (JPEG en data URL), tirée de photoUrl.
  portrait: text("portrait"),
  // Fiche auteur sur le site des Éditions M-Éditer, ou à défaut une page qui présente l'auteur.
  profileUrl: text("profile_url"),
  // « femme » ou « homme », pour équilibrer le tirage des fiches. Déduit de la présentation quand sa grammaire
  // le dit, sinon renseigné par l'équipe ; vide tant qu'on ne sait pas.
  gender: text("gender").$type<"femme" | "homme">(),
  createdAt: createdAt(),
});

export const videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  youtubeId: text("youtube_id").notNull().unique(),
  kind: videoKindEnum("kind").notNull(),
  title: text("title").notNull(),
  speakerId: uuid("speaker_id").references(() => speakers.id, { onDelete: "set null" }),
  durationSeconds: integer("duration_seconds"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  description: text("description"),
  channelId: text("channel_id"),
  // Vidéo détectée automatiquement dans la playlist (et non saisie à la main).
  detectedAt: timestamp("detected_at", { withTimezone: true }),
  // Image d'attente du lecteur (JPEG en data URL) : vignette de la conférence, ou image de l'auteur tirée du Short.
  poster: text("poster"),
  createdAt: createdAt(),
});

export const books = pgTable("books", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  author: text("author").notNull(),
  isbn: text("isbn"),
  catalogueUrl: text("catalogue_url"),
  coverUrl: text("cover_url"),
  summary: text("summary"),
  createdAt: createdAt(),
});

export const sheets = pgTable(
  "sheets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Jour de publication (heure de Paris). Vide pour une fiche non programmée.
    day: date("day", { mode: "string" }),
    // Titre de la fiche : « Interrogeons-nous sur… ». Vide pour les anciennes fiches.
    title: text("title"),
    theme: text("theme").notNull(),
    question: text("question").notNull(),
    synthesis: text("synthesis"),
    // Page « Je suis » : le problème que pose l'alternative de la question, puis la question de solution
    // soumise au lecteur pour sa version 3 (« Quelle attitude adopter (individuelle et collective) pour qu'à la fois… ? »).
    problem: text("problem"),
    solutionQuestion: text("solution_question"),
    // Fin de la page « Je suis » : trois philosophes à lire, chacun avec un livre et deux phrases de présentation.
    readings: jsonb("readings").$type<Reading[]>(),
    // Bibliographie de l'auteur aux Éditions M-Éditer (jusqu'à trois livres).
    authorBooks: jsonb("author_books").$type<AuthorBook[]>(),
    // Page « Pour aller plus loin » : deux articles de presse en ligne qui prennent chacun une branche de l'alternative.
    pressArticles: jsonb("press_articles").$type<PressArticle[]>(),
    shortVideoId: uuid("short_video_id").references(() => videos.id, { onDelete: "set null" }),
    lectureVideoId: uuid("lecture_video_id").references(() => videos.id, { onDelete: "set null" }),
    bookId: uuid("book_id").references(() => books.id, { onDelete: "set null" }),
    status: sheetStatusEnum("status").notNull().default("brouillon"),
    isBackup: boolean("is_backup").notNull().default(false),
    // Vérification de l'origine humaine de l'intervention : condition d'affichage de la mention.
    authenticityVerifiedAt: timestamp("authenticity_verified_at", { withTimezone: true }),
    authenticityVerifiedBy: uuid("authenticity_verified_by").references(() => users.id, { onDelete: "set null" }),
    sources: text("sources"),
    editorialNotes: text("editorial_notes"),
    // Rediffusion d'une fiche déjà publiée, quand aucun nouveau Short n'est paru.
    replayOf: uuid("replay_of"),
    // Vrai si le thème, la question ou la synthèse ont été proposés par un outil d'IA.
    aiDrafted: boolean("ai_drafted").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sheets_day_idx").on(t.day), index("sheets_theme_idx").on(t.theme)],
);

export const notebookEntries = pgTable(
  "notebook_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sheetId: uuid("sheet_id").notNull().references(() => sheets.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    stage: stageEnum("stage").notNull(),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("notebook_version_idx").on(t.userId, t.sheetId, t.version)],
);

// Notes de travail du lecteur sur une fiche : ses notes d'écoute à côté de la conférence (la thèse, les arguments,
// un exemple ou une objection) et son essai pour poser lui-même le problème, avant de lire celui de la fiche.
// Une seule note par lecteur et par fiche, mise à jour au fil du travail.
export interface ListeningNote {
  these: string;
  arguments: string;
  exemples: string;
  probleme?: string;
}

export const listeningNotes = pgTable(
  "listening_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sheetId: uuid("sheet_id").notNull().references(() => sheets.id, { onDelete: "cascade" }),
    notes: jsonb("notes").$type<ListeningNote>().notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("listening_notes_idx").on(t.userId, t.sheetId)],
);

export const syncRuns = pgTable("sync_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: runKindEnum("kind").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  ok: boolean("ok"),
  summary: text("summary"),
  error: text("error"),
});

export type User = typeof users.$inferSelect;
export type Sheet = typeof sheets.$inferSelect;
export type Speaker = typeof speakers.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type Book = typeof books.$inferSelect;
export type NotebookEntry = typeof notebookEntries.$inferSelect;
export type AccessPeriod = typeof accessPeriods.$inferSelect;
