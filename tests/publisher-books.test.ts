import { describe, expect, it } from "vitest";
import { booksFromAuthorPage, detailsFromBookPage, twoSentences } from "../src/lib/publisher-books";

const product = (href: string, title: string, authors: number) => `
<div class="product text-center shipping-level_1" data-type="base_product">
  <span class='p-i-t'>
    <a href="${href}">${title}</a>
  </span>
  <p class='p-i-a'>${Array.from({ length: authors }, (_, i) => `<a href="/auteur/${i}/x">X</a>`).join(", ")}</p>
</div>`;

describe("bibliographie de l'auteur aux Éditions M-Éditer", () => {
  it("lit les livres de la fiche auteur, avec leur nombre d'auteurs", () => {
    const html = product("/produit/210/978/une-lecture-de-spinoza", "Une lecture de Spinoza", 1) + product("/produit/215/978/abecedaire", "ABÉCÉDAIRE PHILOSOPHIQUE À L&#39;USAGE", 26);
    expect(booksFromAuthorPage(html)).toEqual([
      { title: "Une lecture de Spinoza", url: "https://m-editer.izibookstore.com/produit/210/978/une-lecture-de-spinoza", authors: 1 },
      { title: "ABÉCÉDAIRE PHILOSOPHIQUE À L'USAGE", url: "https://m-editer.izibookstore.com/produit/215/978/abecedaire", authors: 26 },
    ]);
  });

  it("reprend les deux premières phrases de la présentation du site, sans les réécrire", () => {
    const ld = { "@type": "Product", description: "<p>Première phrase. Deuxième phrase ! Troisième phrase.</p>", image: ["/system/c.webp"] };
    const html = `<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
    expect(detailsFromBookPage(html)).toEqual({ description: "Première phrase. Deuxième phrase !", image: "https://m-editer.izibookstore.com/system/c.webp" });
    expect(twoSentences("« Citation » : formule. Suite du texte. Fin.")).toBe("« Citation » : formule. Suite du texte.");
  });
});
