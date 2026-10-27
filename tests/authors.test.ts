import { describe, expect, it } from "vitest";
import { authorBio, authorLink, isPublisherPage, photoFromProfilePage, publisherPage } from "@/lib/authors";

describe("Présentation de l'auteur", () => {
  it("reprend telle quelle la présentation de la description YouTube", () => {
    const d = "📋 Présentation : …\n\n🎓 Jean-Luc Nativelle est professeur agrégé de philosophie, enseignant en classes préparatoires aux grandes écoles à Angers. Il intervient également à l'Université Permanente de Nantes. \n📹 Chaîne YouTube";
    expect(authorBio(d, "Jean-Luc Nativelle")).toBe(
      "Jean-Luc Nativelle est professeur agrégé de philosophie, enseignant en classes préparatoires aux grandes écoles à Angers. Il intervient également à l'Université Permanente de Nantes.",
    );
  });

  it("retire « À propos » et les liens", () => {
    const d = "🎓 À propos : Jean-Marie Frey est professeur honoraire de philosophie en classes préparatoires aux Grandes Écoles. 👉 🔗 https://m-editer.izibookstore.com/auteur/17/Jean-Marie%20FREY";
    expect(authorBio(d, "Jean-Marie Frey")).toBe("Jean-Marie Frey est professeur honoraire de philosophie en classes préparatoires aux Grandes Écoles.");
  });

  it("ne renvoie rien si la description ne présente pas l'auteur", () => {
    const d = "🎓 En savoir plus sur l'auteur André Stanguennec : http://m-editer.izibookstore.com/auteur/71/Andre%20STANGUENNEC";
    expect(authorBio(d, "André Stanguennec")).toBeNull();
    expect(authorLink(d)).toBe("http://m-editer.izibookstore.com/auteur/71/Andre%20STANGUENNEC");
    expect(authorBio("🎓 Jean-Marie Frey 🔗 https://www.youtube.com/watch?v=fy0gy06S6qc", "Jean-Marie Frey")).toBeNull();
  });

  it("ignore la présentation d'une autre personne", () => {
    expect(authorBio("🎓 Anne Lepage est étudiante en CPGE.", "Maxence Körner")).toBeNull();
  });
});

describe("Fiche auteur M-Éditer", () => {
  it("retrouve la fiche auteur dont l'adresse porte le nom, en https", () => {
    const ds = [
      "En savoir plus sur l'auteur André Guigot : https://m-editer.izibookstore.com/auteur/35/andre-guigot",
      "🎓 http://m-editer.izibookstore.com/auteur/71/Andre%20STANGUENNEC",
    ];
    expect(publisherPage(ds, "André Stanguennec")).toBe("https://m-editer.izibookstore.com/auteur/71/Andre%20STANGUENNEC");
    expect(publisherPage(ds, "André Guigot")).toBe("https://m-editer.izibookstore.com/auteur/35/andre-guigot");
    expect(publisherPage(ds, "David Christoffel")).toBeNull();
    expect(isPublisherPage("https://m-editer.izibookstore.com/auteur/12/jean-luc-nativelle")).toBe(true);
  });
});

describe("Photo de la fiche auteur", () => {
  const page = "https://m-editer.izibookstore.com/auteur/12/jean-luc-nativelle";
  it("prend l'image de partage de la page", () => {
    const html = `<head><meta property="og:image" content="/media/auteurs/nativelle.jpg"></head>`;
    expect(photoFromProfilePage(html, page, "Jean-Luc Nativelle")).toBe("https://m-editer.izibookstore.com/media/auteurs/nativelle.jpg");
  });
  it("sinon, l'image qui porte le nom de l'auteur, jamais le logo", () => {
    const html = `<img src="/img/logo.png" alt="M-Éditer"><img src="/media/a12.jpg" alt="Jean-Luc NATIVELLE">`;
    expect(photoFromProfilePage(html, page, "Jean-Luc Nativelle")).toBe("https://m-editer.izibookstore.com/media/a12.jpg");
    expect(photoFromProfilePage(`<img src="/img/logo.png">`, page, "Jean-Luc Nativelle")).toBeNull();
  });
  it("préfère la photo marquée « author_picture » au logo de partage", () => {
    const html = `<meta property="og:image" content="/logo-m-editer.png"><img class="author_picture img-circle" alt="Jean-Luc NATIVELLE" src="https://m-editer.izibookstore.com/system/author_pictures/data/008/990/499/regular/Nativelle_Jean-Luc.jpg" />`;
    expect(photoFromProfilePage(html, page, "Jean-Luc Nativelle")).toBe("https://m-editer.izibookstore.com/system/author_pictures/data/008/990/499/regular/Nativelle_Jean-Luc.jpg");
  });
});
