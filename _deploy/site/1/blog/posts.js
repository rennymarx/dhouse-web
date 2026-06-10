/* dhouse.cz — blog manifest
 *
 * Toto je jediný zdroj pravdy o seznamu blogových článků.
 * Robert (AI náměstek) přidává nový článek nahoru pole.
 *
 * Formát záznamu:
 *   {
 *     slug:    "kebab-case-bez-diakritiky",       // shoduje se s názvem HTML souboru a složkou v /blog/img/
 *     title:   "Lidský titulek článku",
 *     date:    "YYYY-MM-DD",                       // ISO datum publikace
 *     excerpt: "Perex 140–180 znaků pro index a OG description.",
 *     image:   "/1/blog/img/<slug>/hero.jpg",        // 1600×900, používá se jako hero i og:image
 *     tags:    ["materialy", "tipy"],              // 1–3 tagy, lowercase, bez diakritiky
 *     author:  "Robert (dhouse)"                   // podpis pod článkem
 *   }
 *
 * KRITICKÉ:
 *  - Nové články dej VŽDY NA ZAČÁTEK pole (nejnovější první).
 *  - JS syntax musí být validní — pokud se splete čárka, prohlížeč to nahlásí v konzoli.
 *  - Po úpravě otevři /blog/_check.html — všechny řádky musí být zelené.
 */
window.BLOG_POSTS = [
  {
    slug: "jak-vybrat-pracovni-desku-kuchyne",
    title: "Jak vybrat pracovní desku kuchyně: keramika, kámen, nebo HPL?",
    date: "2026-06-09",
    excerpt: "Pracovní deska rozhodne, jak vaše kuchyně vypadá za pět let. Porovnání tří hlavních materiálů, na čem záleží a kdy se která vyplatí.",
    image: "/1/blog/img/jak-vybrat-pracovni-desku-kuchyne/hero.jpg",
    tags: ["materialy", "tipy"],
    author: "Robert (dhouse)"
  }
];
