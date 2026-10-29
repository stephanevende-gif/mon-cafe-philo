import { describe, expect, it } from "vitest";
import { booksFromCataloguePage } from "@/lib/catalogue";

const block = (id: number, title: string, authors: string[], lazy = false) => `
<div class="product text-center" data-ean13="97823628${id}0">
  <div class='container-cover'><a href="/produit/${id}/97823628${id}0/livre-${id}">
    <img class="${lazy ? "lazy " : ""}product_picture product-cover" alt="${title}" srcset="https://m-editer.izibookstore.com/system/p/${id}/small/c.webp 128w, https://m-editer.izibookstore.com/system/p/${id}/medium/L&#39;c.webp 256w"${lazy ? "" : ` src="https://m-editer.izibookstore.com/system/p/${id}/medium/c.webp"`} />
  </a></div>
  <span class='p-i-t'>
    <a href="/produit/${id}/97823628${id}0/livre-${id}">${title}</a>
      <small class='p-i-s'>Un sous-titre</small>
  </span>
  <p class='p-i-a'>${authors.map((a, i) => `<a href="/auteur/${i}/x">${a}</a>`).join(", ")}</p>
</div>`;

describe("catalogue des Éditions M-Éditer", () => {
  it("lit titre, sous-titre, auteurs, ISBN, couverture et lien de chaque livre", () => {
    const books = booksFromCataloguePage(block(12, "Le bonheur et la mort", ["Jean-Marie FREY"]) + block(13, "PENSER LA CRISE", ["Jacques RICOT", "Yvon QUINIOU"], true));
    expect(books).toHaveLength(2);
    expect(books[0]).toMatchObject({
      title: "Le bonheur et la mort",
      subtitle: "Un sous-titre",
      author: "Jean-Marie FREY",
      isbn: "97823628120",
      url: "https://m-editer.izibookstore.com/produit/12/97823628120/livre-12",
      cover: "https://m-editer.izibookstore.com/system/p/12/medium/L'c.webp",
    });
    expect(books[1].author).toBe("Jacques RICOT, Yvon QUINIOU");
    expect(books[1].cover).toContain("/13/medium/");
  });
});
