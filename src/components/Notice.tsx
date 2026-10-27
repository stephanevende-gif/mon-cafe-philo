const MESSAGES: Record<string, { text: string; kind: "ok" | "error" }> = {
  enregistre: { text: "Votre réflexion est enregistrée dans votre carnet.", kind: "ok" },
  vide: { text: "Écrivez quelques mots avant d'enregistrer.", kind: "error" },
  trop: { text: "Vous avez enregistré beaucoup de versions en peu de temps. Réessayez dans une heure.", kind: "error" },
  acces: { text: "Votre accès a pris fin. Vous pouvez le prolonger depuis votre compte.", kind: "error" },
  identifiants: { text: "Adresse e-mail ou mot de passe incorrect.", kind: "error" },
  limite: { text: "Trop de tentatives. Patientez quelques minutes avant de réessayer.", kind: "error" },
  email_pris: { text: "Un compte existe déjà avec cette adresse. Connectez-vous ou réinitialisez votre mot de passe.", kind: "error" },
  champs: { text: "Certains champs sont incomplets ou incorrects.", kind: "error" },
  consentement: { text: "Vous devez accepter les conditions d'utilisation pour créer un compte.", kind: "error" },
  code_acces: { text: "Le code d'accès testeur n'est pas le bon. Vérifiez-le auprès des Éditions M-Éditer.", kind: "error" },
  mot_de_passe: { text: "Le mot de passe doit contenir au moins 10 caractères.", kind: "error" },
  jeton: { text: "Ce lien n'est plus valable. Demandez-en un nouveau.", kind: "error" },
  verifie: { text: "Votre adresse e-mail est confirmée. Merci.", kind: "ok" },
  envoye: { text: "Si un compte existe pour cette adresse, un e-mail vient d'être envoyé.", kind: "ok" },
  reinitialise: { text: "Votre mot de passe est modifié. Vous pouvez vous connecter.", kind: "ok" },
  bienvenue: { text: "Bienvenue. Vos 10 jours gratuits commencent aujourd'hui. Un e-mail de confirmation vous a été envoyé.", kind: "ok" },
  confirmation: { text: "Pour supprimer votre compte, tapez SUPPRIMER et indiquez votre mot de passe.", kind: "error" },
  sauve: { text: "Modifications enregistrées.", kind: "ok" },
  suspendu: { text: "Ce compte est suspendu. Écrivez aux Éditions M-Éditer pour contester cette décision.", kind: "error" },
};

export function Notice({ code }: { code?: string | string[] }) {
  const key = Array.isArray(code) ? code[0] : code;
  if (!key) return null;
  const m = MESSAGES[key] ?? { text: decodeURIComponent(key), kind: "error" as const };
  return (
    <p className={`notice ${m.kind}`} role={m.kind === "error" ? "alert" : "status"}>
      {m.text}
    </p>
  );
}
