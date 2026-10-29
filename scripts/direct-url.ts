// Les scripts de déploiement (migrations, instantané) passent par une connexion directe à la base quand
// Neon en fournit une : le pooler partage les connexions entre clients, ce qui ne convient pas aux
// réglages de session ni aux longues transactions.
export function directUrl(): string {
  return process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL!;
}
